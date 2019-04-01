
import { Dir, GamePos, TilePos } from "../geometry/pos";
import { Rect } from "../geometry/rect";
import { Option, Selectable } from "../menu";
import { Scheduler } from "../scheduler";
import { Item } from "./item";
import { World } from "./world";

export class Worker implements Selectable {
	parent: Scheduler;
	pos: TilePos;
	item: Item | null = null;

	moveDelay: number = 0;
	totalMoveDelay: number = 0;
	moveDirection: Dir;
	absolutePosition: GamePos;

	constructor(parent: Scheduler, pos: TilePos) {
		this.parent = parent;
		this.pos = new TilePos(pos);
		this.absolutePosition = this.pos.toGamePos();
	}

	isMoving(): boolean {
		return this.moveDelay > 0;
	}

	setMovement(dir: Dir, walkCost: number) {
		this.moveDirection = dir;
		this.moveDelay = this.totalMoveDelay = walkCost;
	}

	updateMovement(): boolean {
		if (!this.isMoving()) {
			return false;
		}
		this.moveDelay--;
		if (!this.isMoving()) {
			this.pos.move(this.moveDirection);
			if (this.item) {
				this.item.pos = this.pos.mid();
			}
		}
		return this.isMoving();
	}

	animationUpdate(subTickProgress: number) {
		if (this.isMoving()) {
			const progress = 1 - this.moveDelay / this.totalMoveDelay + 1 / this.totalMoveDelay * subTickProgress;
			const current = this.pos.toGamePos();
			const next = this.pos.getInDir(this.moveDirection).toGamePos();
			const offset = next.minus(current).scale(progress);
			this.absolutePosition.set(this.pos.toGamePos().plus(offset));
		} else {
			this.absolutePosition.set(this.pos.toGamePos());
		}
	}

	draw(context: CanvasRenderingContext2D, cellSize: number) {
		context.fillStyle = "red";
		const rect = this.getOutline();
		context.fillRect(rect.x, rect.y, rect.width, rect.height);
	}
	getOutline(): Rect {
		const sizeOffset = World.tileSize / 5;
		const leftTop = this.absolutePosition.plus(sizeOffset, sizeOffset);
		const rightBottom = leftTop.plus(World.tileSize - 2 * sizeOffset, World.tileSize - 2 * sizeOffset);
		return new Rect(leftTop, rightBottom);
	}
	getDescription(): string {
		return `Worker`;
	}
	getInfo(): string {
		let info = "";
		if (this.item) {
			info += "Carrying: " + this.item.getDescription() + "\n";
		}
		return info;
	}
	getOptionMenu(workers: Set<Worker>): Option[] {
		return [
			{
				name: "Return to Base",
				callback: () => {
					workers.forEach(w => w.parent.removeWorker(w));
					return true;
				}
			}
		]
	}
}
