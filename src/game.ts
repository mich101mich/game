
import { GamePos, TilePos, Dir } from "./geometry/mod";
import { Machine, MachineType } from "./machine";
import { Items, Jobs, Machines, Menus, Resources, Workers } from "./managers/mod";
import { Menu, Selectable } from "./menu";
import { MouseHandler } from "./mouseHandler";
import { Tile, TileType } from "./tile";
import { Wasm } from "./wasm";
import { Worker } from "./worker";
import { ItemType } from "./item";

const CELL_SIZE = 16;

export class Game {
	static wasm: Wasm;
	static mouseHandler: MouseHandler;

	static background: HTMLCanvasElement;
	static canvas: HTMLCanvasElement;
	static assets: ImageBitmap;

	static resources = new Resources();
	static machines = new Machines();
	static workers = new Workers();
	static items = new Items();
	static jobs = new Jobs();
	static menu = new Menus();

	static drillLevel = 0;
	static drillSpeed = 1;

	static backgroundDirty = false;

	static time = 0;
	static timeDebt = 0;
	static gameSpeed = 200;
	static subTickProgress = 0;

	static debugModeActive = false;
	static debugDisplayActive = false;

	static TILE_WIDTH = 128;
	static TILE_HEIGHT = 128;
	static GAME_WIDTH = Game.TILE_WIDTH * CELL_SIZE;
	static GAME_HEIGHT = Game.TILE_HEIGHT * CELL_SIZE;
	static SCREEN_WIDTH = 40 * CELL_SIZE;
	static SCREEN_HEIGHT = 40 * CELL_SIZE;

	static get cellSize() {
		return CELL_SIZE;
	}

	static init(wasm: Wasm, assets: ImageBitmap) {

		Game.canvas = document.getElementById("canvas") as HTMLCanvasElement;

		function resize() {
			const rect = Game.canvas.getBoundingClientRect();
			Game.SCREEN_WIDTH = rect.width;
			Game.SCREEN_HEIGHT = rect.height;

			Game.canvas.width = Game.SCREEN_WIDTH;
			Game.canvas.height = Game.SCREEN_HEIGHT;
		}

		window.addEventListener("resize", resize);
		resize();

		Game.assets = assets;
		Game.wasm = wasm;
		Game.wasm.init(Game.TILE_WIDTH, Game.TILE_HEIGHT);

		Game.background = document.createElement("canvas");

		Game.background.width = Game.GAME_WIDTH;
		Game.background.height = Game.GAME_HEIGHT;

		Game.menu.info = document.getElementById("info") as HTMLDivElement;

		Game.mouseHandler = new MouseHandler(Game.canvas, (selection) => Game.menu.onNewSelection(selection));

		const list = document.getElementById("options") as HTMLTableElement;
		Game.menu.side = new Menu(list);

		const contextList = document.getElementById("contextMenu") as HTMLTableElement;
		Game.menu.context = new Menu(contextList, false);

		Game.canvas.addEventListener("click", event => {
			Game.menu.context.selection.clear();
			Game.menu.context.refresh();
		});

		Game.canvas.addEventListener("contextmenu", event => {
			const pos = Game.getMousePos(event);
			const clicked = Game.getSelectableAt(pos.toGamePos());

			if (pos.isValid()) {
				event.preventDefault();
			}

			Game.menu.context.container.style.left = event.pageX + "px";
			Game.menu.context.container.style.top = event.pageY + "px";
			if (clicked) {
				Game.menu.context.selection.clear();
				Game.menu.context.selection.add(clicked);
				Game.menu.side.selection.clear();
			} else {
				Game.menu.context.selection.clear();
			}
			Game.menu.refresh();
		})

		const midX = Game.TILE_WIDTH / 2;
		const midY = Game.TILE_HEIGHT / 2;

		Game.machines.add(new Machine(new TilePos(midX, midY), MachineType.Spawn));
		for (let i = 1; i < 3; i++) {
			Game.machines.add(new Machine(new TilePos(midX, midY + i), MachineType.Platform));
		}
		for (let i = 1; i < 5; i++) {
			Game.machines.add(new Machine(new TilePos(midX, midY - i), MachineType.Platform));
		}
		Game.machines.add(new Machine(new TilePos(midX - 1, midY - 4), MachineType.Platform));
		for (let i = 1; i < 4; i++) {
			Machine.constructMachine(new TilePos(midX - i, midY), MachineType.Platform);
		}
		for (let i = 1; i < 3; i++) {
			Game.machines.add(new Machine(new TilePos(midX + i, midY), MachineType.Platform));
		}
		for (let i = 0; i < 2; i++) {
			Game.machines.add(new Machine(new TilePos(midX + 3, midY + i), MachineType.Platform));
		}
		Game.machines.add(new Machine(new TilePos(midX + 3, midY + 2), MachineType.Lab));

		Game.workers.add(new Worker(new TilePos(midX - 1, midY - 1)));
		Game.workers.add(new Worker(new TilePos(midX - 1, midY + 1)));
		Game.workers.add(new Worker(new TilePos(midX, midY - 1)));
		Game.workers.add(new Worker(new TilePos(midX, midY + 1)));
		Game.workers.add(new Worker(new TilePos(midX + 1, midY - 1)));
		Game.workers.add(new Worker(new TilePos(midX + 1, midY)));
		Game.workers.add(new Worker(new TilePos(midX + 1, midY + 1)));

		Game.resources.display = document.getElementById("resources") as HTMLDivElement;

		Game.refreshBackground();

		requestAnimationFrame(Game.update.bind(Game));
	}

	static update(currentTime: number) {
		requestAnimationFrame(Game.update.bind(Game));
		const deltaTime = currentTime - Game.time;
		Game.time = currentTime;
		Game.timeDebt += deltaTime;

		if (Game.timeDebt >= Game.gameSpeed) {
			Game.timeDebt = 0;
			Game.subTickProgress = 0;
			for (const worker of Game.workers) {
				worker.tick();
			}
			for (const machine of Game.machines) {
				machine.tick();
			}
		} else {
			Game.subTickProgress = Game.timeDebt / Game.gameSpeed;
		}

		if (Game.backgroundDirty) {
			Game.refreshBackground();
		}

		Game.draw();
	}

	static draw() {
		const context = Game.canvas.getContext("2d");

		context.imageSmoothingEnabled = false;
		context.oImageSmoothingEnabled = false;
		context.mozImageSmoothingEnabled = false;
		context.webkitImageSmoothingEnabled = false;

		context.setTransform(1, 0, 0, 1, 0, 0);

		context.fillStyle = "#333333";
		context.fillRect(0, 0, Game.canvas.width, Game.canvas.height);

		context.setTransform(Game.mouseHandler.zoom, 0, 0, Game.mouseHandler.zoom, Game.mouseHandler.offset.x, Game.mouseHandler.offset.y);

		context.drawImage(Game.background, 0, 0);

		for (const machine of Game.machines) {
			machine.draw(context);
		}
		for (const worker of Game.workers) {
			worker.draw(context);
		}
		for (const item of Game.items) {
			item.draw(context);
		}

		Game.menu.side.draw(context);
		Game.menu.context.draw(context);
		let text = "";
		if (Game.menu.side.selection.size) {
			text = Game.menu.side.getInfo();
		} else if (Game.menu.context.selection.size) {
			text = Game.menu.context.getInfo();
		}
		if (text) {
			if (text[text.length - 1] != "\n") {
				text += "\n";
			}
			text += "--------------------"
		}
		Game.menu.info.innerText = text;

		Game.resources.draw();

		Game.mouseHandler.draw(context, CELL_SIZE);

		if (Game.debugDisplayActive) {
			const pos = Game.mouseHandler.mouse.toTilePos();
			context.setTransform(1, 0, 0, 1, 0, 0);

			const fontArgs = context.font.split(" ");
			const font = fontArgs[fontArgs.length - 1];
			context.font = CELL_SIZE + "px " + font;

			const textWidth = context.measureText(Math.max(pos.x, pos.y).toString()).width;

			context.fillStyle = "black";
			context.fillRect(0, 0, textWidth + 8, CELL_SIZE * 2 + 8);
			context.fillStyle = "white";
			context.fillRect(2, 2, textWidth + 4, CELL_SIZE * 2 + 4);
			context.strokeStyle = "black";
			context.strokeText(pos.x.toString(), 4, CELL_SIZE + 2);
			context.strokeText(pos.y.toString(), 4, CELL_SIZE * 2 + 2);
		}
	}

	static refreshBackground() {

		Game.backgroundDirty = false;

		const context = Game.background.getContext("2d");
		context.fillStyle = "black";
		context.fillRect(0, 0, Game.GAME_WIDTH, Game.GAME_HEIGHT);
		context.fillStyle = "white";
		const pos = new TilePos(0, 0);
		for (pos.y = 0; pos.y < Game.TILE_HEIGHT; pos.y++) {
			for (pos.x = 0; pos.x < Game.TILE_WIDTH; pos.x++) {
				if (Game.wasm.is_visible(pos.x, pos.y)) {
					context.fillRect(pos.x * CELL_SIZE, pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
					const n = Game.wasm.get(pos.x, pos.y) as number;
					if (Game.wasm.get(pos.x, pos.y) == TileType.Platform) {
						const variant = [0, 1, 2, 3].map(dir => {
							const other = pos.getInDir(dir as Dir);
							if (!other.isValid()) {
								return false;
							}
							const type = Game.wasm.get(other.x, other.y);
							return type == TileType.Platform || type == TileType.Machine;
						})
							.map(hasNeighbour => hasNeighbour ? 1 : 0)
							.reduceRight((prev, curr) => (prev << 1) | curr, 0);
						context.drawImage(Game.assets, variant * 16, 32, 16, 16, pos.x * CELL_SIZE, pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
					} else {
						context.drawImage(Game.assets, n * 16, 0, 16, 16, pos.x * CELL_SIZE, pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
					}
				}
			}
		}
		if (Game.debugDisplayActive) {
			context.strokeStyle = "red";
			context.beginPath();
			const chunkSize = Game.wasm.chunk_size();
			for (let y = 0; y < Game.TILE_HEIGHT; y += chunkSize) {
				context.moveTo(0, y * CELL_SIZE);
				context.lineTo(Game.GAME_WIDTH, y * CELL_SIZE);
			}
			for (let x = 0; x < Game.TILE_WIDTH; x += chunkSize) {
				context.moveTo(x * CELL_SIZE, 0);
				context.lineTo(x * CELL_SIZE, Game.GAME_HEIGHT);
			}
			context.stroke();
			const colors = ["black"];
			for (let i = 1; i < chunkSize * 4; i++) {
				let percent = i / (chunkSize * 4);
				colors.push("rgb(" + (percent * 255) + ", " + (255 - percent * 255) + ", 0)")
			}
			Game.wasm.iter_links();
			do {
				const x = Game.wasm.link_x();
				const y = Game.wasm.link_y();
				const id = Game.wasm.link_id();

				const rect = Tile.at(x, y).getOutline();
				context.strokeStyle = "red";
				context.strokeRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2);
				do {
					const cx = Game.wasm.connection_x();
					const cy = Game.wasm.connection_y();
					const cost = Game.wasm.connection_cost();
					context.strokeStyle = colors[cost];
					context.beginPath();
					context.moveTo((x + 0.5) * CELL_SIZE, (y + 0.5) * CELL_SIZE);
					const midX = ((x + 0.5) + (cx + 0.5)) / 2;
					const midY = ((y + 0.5) + (cy + 0.5)) / 2;
					context.lineTo(midX * CELL_SIZE, midY * CELL_SIZE);
					context.stroke();
				} while (Game.wasm.next_connection());

				context.strokeStyle = "blue";
				context.strokeText(id.toString(), rect.left, rect.bottom);
			} while (Game.wasm.next_link());
		}
	}

	static place(pos: TilePos, material: TileType) {
		Game.wasm.set(pos.x, pos.y, material);
		Game.wasm.set_visible(pos.x, pos.y);
		Game.backgroundDirty = true;

		const tile = Tile.at(pos);
		Game.mouseHandler.selection.delete(tile);
		Game.menu.side.selection.delete(tile);
		Game.menu.context.selection.delete(tile);
	}

	static getRawMousePos(event: MouseEvent): GamePos {
		const rect = Game.canvas.getBoundingClientRect();
		return new GamePos(event.pageX, event.pageY)
			.minus(rect.left, rect.top);
	}

	static getMousePos(event: MouseEvent): GamePos {
		return Game.getRawMousePos(event)
			.minus(Game.mouseHandler.offset)
			.scale(1 / Game.mouseHandler.zoom);
	}

	static isFree(pos: TilePos): boolean {
		if (!pos.isValid()) {
			return false;
		}
		const tile = Tile.at(pos);
		if (!tile.isVisible() || tile.type != TileType.Air) {
			return false;
		}
		const rect = tile.getOutline();
		for (const worker of Game.workers) {
			if (worker.getOutline().intersects(rect)) {
				return false;
			}
		}
		for (const item of Game.items) {
			if (item.getOutline().intersects(rect)) {
				return false;
			}
		}
		for (const machine of Game.machines) {
			if (machine.getOutline().intersects(rect)) {
				return false;
			}
		}
		return true;
	}

	static getSelectableAt(gamePos: GamePos): Selectable {
		if (!gamePos.isValid()) {
			return null;
		}
		const pos = gamePos.toTilePos();
		const tile = Tile.at(pos);
		if (!tile.isVisible()) {
			return null;
		}

		for (const worker of Game.workers) {
			if (worker.getOutline().contains(gamePos)) {
				return worker;
			}
		}
		for (const item of Game.items) {
			if (item.getOutline().contains(gamePos)) {
				return item;
			}
		}
		for (const machine of Game.machines) {
			if (machine.getOutline().contains(gamePos)) {
				return machine;
			}
		}
		if (!tile.isSelectable()) {
			return null;
		}
		return tile;
	}

	static debugMode() {
		if (Game.debugModeActive) {
			return;
		}
		Game.debugModeActive = true;
		Game.gameSpeed = 0;
		Game.mouseHandler.brushSize = 60;
		for (const machine of Game.machines) {
			machine.level = 100;
		}
		Machine.debugMode();
		Game.resources.add(ItemType.Ore, 1000000);
		Game.resources.add(ItemType.Crystal, 1000000);
		Game.backgroundDirty = true;
	}
	static debugDisplay() {
		Game.debugDisplayActive = !Game.debugDisplayActive;
		Game.backgroundDirty = true;
	}
}
