
import { Game } from "./game";
import { GamePos } from "./geometry/pos";
import { Rect } from "./geometry/rect";
import { Selectable } from "./menu";
import { Machine, MachineType } from "./world/machine";
import { Tile } from "./world/tile";
import { World } from "./world/world";

export enum MouseMode {
	Default,
	TileBrush,
	WorkerSelection,
	PlacePlatform,
}

export class MouseHandler {

	element: HTMLElement;
	brushSize = 30;

	zoom: number = 1;
	offset: GamePos;

	mouseMode: MouseMode = MouseMode.Default;

	eventRelevant: boolean = false;
	hasMoved = false;

	startPos: GamePos = new GamePos(0, 0);
	selection = new Set<Selectable>();
	onNewSelection: (selection: Set<Selectable>) => void;

	mouse = new GamePos(0, 0);
	rawMouse = new GamePos(0, 0);
	mouseDown = false;

	constructor(element: HTMLElement, onNewSelection: (selection: Set<Selectable>) => void) {

		this.element = element;
		this.onNewSelection = onNewSelection;
		const mid = new GamePos(Game.width, Game.height).scale(1 / 2);
		const screenMid = new GamePos(Game.SCREEN_WIDTH, Game.SCREEN_HEIGHT).scale(1 / 2);
		this.offset = screenMid.minus(mid);

		document.addEventListener("keydown", event => {
			this.updateKeys(event);
			if (event.key == "Escape") {
				this.selection.clear();
				this.onNewSelection(this.selection);
				this.eventRelevant = false;
				event.preventDefault();
			}
		});
		document.addEventListener("keyup", event => this.updateKeys(event));

		document.addEventListener("mousedown", event => {
			this.updateKeys(event);
			if (event.button == 0) {
				this.eventRelevant = event.target == this.element;
				this.handleMouseEvent(event, true, false);
			}
		});

		document.addEventListener("mousemove", event => {
			this.updateKeys(event);

			if (!Game.getMousePos(event).equals(this.mouse)) {
				this.handleMouseEvent(event, false, false);
			}
		});

		document.addEventListener("mouseup", event => {
			this.updateKeys(event);
			if (event.button == 0) {
				this.handleMouseEvent(event, false, true);
			}
		});

		element.addEventListener("wheel", event => {
			this.updateKeys(event);

			const scale = 1 - event.deltaY / 1000;

			const rect = this.element.getBoundingClientRect();
			this.offset.x = (event.pageX - rect.left) * (1 - scale) + this.offset.x * scale;
			this.offset.y = (event.pageY - rect.top) * (1 - scale) + this.offset.y * scale;

			this.zoom *= scale;
			event.preventDefault();
		});
	}

	updateKeys(event: KeyboardEvent | MouseEvent) {
		if (event.shiftKey) {
			if (this.mouseMode != MouseMode.TileBrush) {
				this.mouseMode = MouseMode.TileBrush;
			}
		} else if (event.ctrlKey) {
			if (this.mouseMode != MouseMode.WorkerSelection) {
				this.mouseMode = MouseMode.WorkerSelection;
				if (this.mouseDown) {
					this.startPos.set(this.mouse);
				}
			}
		} else {
			if (this.mouseMode == MouseMode.TileBrush || this.mouseMode == MouseMode.WorkerSelection) {
				this.mouseMode = MouseMode.Default;
				if (this.mouseDown) {
					this.selection.clear();
					this.onNewSelection(this.selection);
				}
			}
		}
	}
	private handleMouseEvent(event: MouseEvent, down: boolean, up: boolean) {

		if (this.eventRelevant) {
			event.preventDefault();
		}

		const pos = Game.getMousePos(event);
		const rawPos = Game.getRawMousePos(event);

		const move = !up && !down;
		this.mouseDown = !up && (down || this.mouseDown);
		this.hasMoved = move;

		if (down && this.mouseMode != MouseMode.Default) {
			this.selection.clear();
			this.onNewSelection(this.selection);
			this.startPos.set(pos);
		}

		if (this.mouseDown && this.eventRelevant) {
			if (this.mouseMode == MouseMode.TileBrush) {
				this.appendTargets(pos);
			} else if (this.mouseMode == MouseMode.PlacePlatform) {
				const tilePos = pos.toTilePos();
				const tile = Tile.at(tilePos);
				if (tile && tile.isVisible() && Game.isFree(tilePos)) {
					Machine.constructMachine(tilePos, MachineType.Platform);
				}
			} else if (this.mouseMode == MouseMode.Default && move) {
				const delta = rawPos.minus(this.rawMouse);
				this.offset = this.offset.plus(delta);
			}
		}

		if (up && this.eventRelevant) {
			if (this.mouseMode == MouseMode.WorkerSelection) {
				const rect = new Rect(this.startPos, pos);
				for (const worker of Game.scheduler.workers) {
					if (rect.intersects(worker.getOutline())) {
						this.selection.add(worker);
					}
				}
			} else if (this.mouseMode == MouseMode.Default && !this.hasMoved) {
				this.selection.clear();
				const target = Game.getSelectableAt(pos);
				if (target) {
					this.selection.add(target);
				}
			}

			if (this.mouseMode != MouseMode.Default || !this.hasMoved) {
				this.onNewSelection(this.selection);
				this.selection.clear();
			}
		}

		this.mouse.set(pos);
		this.rawMouse.set(rawPos);
	}
	private appendTargets(pos: GamePos) {
		if (this.mouseMode != MouseMode.TileBrush) {
			return;
		}
		const leftTop = pos.minus(this.brushSize, this.brushSize).toTilePos();
		const rightBottom = pos.plus(this.brushSize, this.brushSize).toTilePos();
		for (let x = leftTop.x; x <= rightBottom.x; x++) {
			for (let y = leftTop.y; y <= rightBottom.y; y++) {
				const tile = Tile.at(x, y);
				if (tile && tile.isVisible()
					&& tile.isDrillable()
					&& tile.isSelectable()
					&& (tile.pos.mid().toGamePos().distance(pos) < this.brushSize + World.tileSize / 2
						|| tile.pos.toGamePos().distance(pos) < this.brushSize
						|| tile.pos.plus(1, 0).toGamePos().distance(pos) < this.brushSize
						|| tile.pos.plus(0, 1).toGamePos().distance(pos) < this.brushSize
						|| tile.pos.plus(1, 1).toGamePos().distance(pos) < this.brushSize)
				) {
					this.selection.add(tile);
				}
			}
		}
	}

	draw(context: CanvasRenderingContext2D, cellSize: number) {

		context.strokeStyle = "red";
		for (const sel of this.selection) {
			const rect = sel.getOutline();
			context.strokeRect(rect.x, rect.y, rect.width, rect.height);
		};

		context.fillStyle = "rgba(180, 180, 255, 0.7)";

		context.beginPath();
		if (this.mouseMode == MouseMode.TileBrush) {
			context.ellipse(this.mouse.x, this.mouse.y, this.brushSize, this.brushSize, 0, 0, 2 * Math.PI);
		} else if (this.mouseMode == MouseMode.WorkerSelection) {
			if (this.mouseDown) {
				const size = this.mouse.minus(this.startPos);
				context.rect(this.startPos.x, this.startPos.y, size.x, size.y);
			}
		} else if (this.mouseMode == MouseMode.PlacePlatform) {
			const mouseTarget = this.mouse.toTilePos();
			World.drawMachine(context, MachineType.Platform, new Rect(mouseTarget.toGamePos(), cellSize, cellSize));
			if (!Game.isFree(mouseTarget)) {
				context.fillStyle = "rgba(255, 0, 0, 0.5)";
				context.fillRect(mouseTarget.x * cellSize, mouseTarget.y * cellSize, cellSize, cellSize);
			}
			return;
		} else {
			const mouseTarget = this.mouse.toTilePos();
			context.rect(mouseTarget.x * cellSize, mouseTarget.y * cellSize, cellSize, cellSize);
		}
		context.fill();
	}
}
