
import { GamePos, TilePos } from "./geometry/pos";
import { Menus } from "./managers/menus";
import { Menu, Selectable } from "./menu";
import { MouseHandler } from "./mouseHandler";
import { Scheduler } from "./scheduler";
import { ItemType } from "./world/item";
import { Machine, MachineType } from "./world/machine";
import { Tile, Material } from "./world/tile";
import { World } from "./world/world";
import { Wasm } from "./main";

export class Game {
	static mouseHandler: MouseHandler;

	static canvas: HTMLCanvasElement;

	static menu = new Menus();
	static scheduler = new Scheduler();

	static drillLevel = 0;
	static drillSpeed = 1;

	static time = 0;
	static timeDebt = 0;
	static gameSpeed = 200;

	static debugModeActive = false;
	static debugDisplayActive = false;

	static get width() {
		return World.width * World.tileSize;
	}
	static get height() {
		return World.height * World.tileSize;
	}

	static SCREEN_WIDTH = 40 * World.width;
	static SCREEN_HEIGHT = 40 * World.height;

	static init(wasm: Wasm, assets: ImageBitmap) {

		World.init(wasm, assets);
		Tile.wasm = wasm;

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

		Game.menu.info = document.getElementById("info") as HTMLDivElement;

		Game.mouseHandler = new MouseHandler(Game.canvas, (selection) => Game.menu.onNewSelection(selection));

		const list = document.getElementById("options") as HTMLTableElement;
		Game.menu.side = new Menu(Game.mouseHandler, list);

		const contextList = document.getElementById("contextMenu") as HTMLTableElement;
		Game.menu.context = new Menu(Game.mouseHandler, contextList, false);

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

		const midX = World.width / 2;
		const midY = World.height / 2;

		Game.scheduler.machines.add(new Machine(Game.scheduler, new TilePos(midX, midY), MachineType.Spawn));
		for (let i = 1; i < 3; i++) {
			Game.scheduler.machines.add(new Machine(Game.scheduler, new TilePos(midX, midY + i), MachineType.Platform));
		}
		for (let i = 1; i < 5; i++) {
			Game.scheduler.machines.add(new Machine(Game.scheduler, new TilePos(midX, midY - i), MachineType.Platform));
		}
		Game.scheduler.machines.add(new Machine(Game.scheduler, new TilePos(midX - 1, midY - 4), MachineType.Platform));
		for (let i = 1; i < 4; i++) {
			Machine.constructMachine(new TilePos(midX - i, midY), MachineType.Platform);
		}
		for (let i = 1; i < 3; i++) {
			Game.scheduler.machines.add(new Machine(Game.scheduler, new TilePos(midX + i, midY), MachineType.Platform));
		}
		for (let i = 0; i < 2; i++) {
			Game.scheduler.machines.add(new Machine(Game.scheduler, new TilePos(midX + 3, midY + i), MachineType.Platform));
		}
		Game.scheduler.machines.add(new Machine(Game.scheduler, new TilePos(midX + 3, midY + 2), MachineType.Lab));

		Game.scheduler.addWorker(new TilePos(midX - 1, midY - 1));
		Game.scheduler.addWorker(new TilePos(midX - 1, midY + 1));
		Game.scheduler.addWorker(new TilePos(midX, midY - 1));
		Game.scheduler.addWorker(new TilePos(midX, midY + 1));
		Game.scheduler.addWorker(new TilePos(midX + 1, midY - 1));
		Game.scheduler.addWorker(new TilePos(midX + 1, midY));
		Game.scheduler.addWorker(new TilePos(midX + 1, midY + 1));

		Game.scheduler.resources.display = document.getElementById("resources") as HTMLDivElement;

		const params = new URL(window.location.toString()).searchParams;
		function parseParamInt(name: string, standard = 0): number {
			if (!params.has(name) || !params.get(name)!.match(/^\d+$/)) {
				return standard;
			}
			return parseInt(params.get(name)!);
		}
		function parseParamBool(name: string, standard = false): boolean {
			if (!params.has(name)) {
				return standard;
			}
			return params.get(name) != "false" && params.get(name) != "0";
		}
		if (parseParamBool("debug") || parseParamBool("debugMode")) {
			Game.debugMode();
		}

		if (parseParamBool("debugDisplay")) {
			Game.debugDisplay();

			if (parseParamInt("hpaLevel", 0) == -1) {
				World.debugParams.hpaLevel = -1;
			}
			if (!parseParamBool("edges", true)) {
				World.debugParams.edges = false;
			}
			if (!parseParamBool("ignoreVisibility", true)) {
				World.debugParams.ignoreVisibility = false;
			}
		} else {
			World.debugParams.hpaLevel = parseParamInt("hpaLevel", -1);
			World.debugParams.edges = parseParamBool("edges");
			World.debugParams.ignoreVisibility = parseParamBool("ignoreVisibility");
		}

		requestAnimationFrame(Game.update);
	}

	static update(currentTime: number) {
		requestAnimationFrame(Game.update);
		const deltaTime = currentTime - Game.time;
		Game.time = currentTime;
		Game.timeDebt += deltaTime;

		if (Game.timeDebt >= Game.gameSpeed) {
			Game.timeDebt = 0;
			Game.tick();
		}
		Game.animationUpdate(Game.timeDebt / Game.gameSpeed);

		Game.draw();
	}

	static tick() {
		Game.scheduler.tick();
	}

	static animationUpdate(subTickProgress: number) {
		Game.scheduler.animationUpdate(subTickProgress);
	}

	static draw() {
		const context = Game.canvas.getContext("2d");
		if (!context) {
			throw new Error("Canvas 2d-Mode not supported");
		}

		context.imageSmoothingEnabled = false;

		context.setTransform(1, 0, 0, 1, 0, 0);

		context.fillStyle = "#333333";
		context.fillRect(0, 0, Game.canvas.width, Game.canvas.height);

		context.setTransform(Game.mouseHandler.zoom, 0, 0, Game.mouseHandler.zoom, Game.mouseHandler.offset.x, Game.mouseHandler.offset.y);

		World.draw(context, Game.debugDisplayActive);

		for (const machine of Game.scheduler.machines) {
			machine.draw(context);
		}
		for (const worker of Game.scheduler.workers) {
			worker.draw(context, World.tileSize);
		}
		for (const item of Game.scheduler.items) {
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

		Game.scheduler.resources.draw();

		Game.mouseHandler.draw(context, World.tileSize);

		if (Game.debugDisplayActive) {
			const pos = Game.mouseHandler.mouse.toTilePos();
			context.setTransform(1, 0, 0, 1, 0, 0);

			const fontArgs = context.font.split(" ");
			const font = fontArgs[fontArgs.length - 1];
			context.font = World.tileSize + "px " + font;

			const textWidth = context.measureText(Math.max(pos.x, pos.y).toString()).width;

			context.fillStyle = "black";
			context.fillRect(0, 0, textWidth + 8, World.tileSize * 2 + 8);
			context.fillStyle = "white";
			context.fillRect(2, 2, textWidth + 4, World.tileSize * 2 + 4);
			context.strokeStyle = "black";
			context.strokeText(pos.x.toString(), 4, World.tileSize + 2);
			context.strokeText(pos.y.toString(), 4, World.tileSize * 2 + 2);
		}
	}

	static place(pos: TilePos, material: Material) {
		World.place(pos, material);

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
		if (!tile.isVisible() || tile.type != Material.Air) {
			return false;
		}
		const rect = tile.getOutline();
		for (const worker of Game.scheduler.workers) {
			if (worker.getOutline().intersects(rect)) {
				return false;
			}
		}
		for (const item of Game.scheduler.items) {
			if (item.getOutline().intersects(rect)) {
				return false;
			}
		}
		for (const machine of Game.scheduler.machines) {
			if (machine.getOutline().intersects(rect)) {
				return false;
			}
		}
		return true;
	}

	static getSelectableAt(gamePos: GamePos): Selectable | null {
		if (!gamePos.isValid()) {
			return null;
		}
		const pos = gamePos.toTilePos();
		const tile = Tile.at(pos);
		if (!tile.isVisible()) {
			return null;
		}

		for (const worker of Game.scheduler.workers) {
			if (worker.getOutline().contains(gamePos)) {
				return worker;
			}
		}
		for (const item of Game.scheduler.items) {
			if (item.getOutline().contains(gamePos)) {
				return item;
			}
		}
		for (const machine of Game.scheduler.machines) {
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
		for (const machine of Game.scheduler.machines) {
			machine.level = 100;
		}
		Machine.debugMode();
		Game.scheduler.resources.add(ItemType.Ore, 1000000);
		Game.scheduler.resources.add(ItemType.Crystal, 1000000);
		World.needsDrawing = true;
	}
	static debugDisplay() {
		Game.debugDisplayActive = !Game.debugDisplayActive;
		World.needsDrawing = true;
		if (Game.debugDisplayActive) {
			World.debugParams.hpaLevel = 0;
			World.debugParams.edges = true;
			World.debugParams.ignoreVisibility = true;
		}
	}
}
