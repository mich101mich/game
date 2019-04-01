
import { Game } from "./game";
import { Path, Rect, TilePos, Dir } from "./geometry/mod";
import { Item } from "./item";
import { Job, PickupItemJob } from "./jobs/mod";
import { Option, Selectable } from "./menu";
import { Tile } from "./tile";

const SIZE_OFFSET = 3;

export class Worker implements Selectable {
	pos: TilePos;
	job: Job | null;
	item: Item | null;
	pathLen: number;
	moveDelay: number = 0;
	totalMoveDelay: number = 0;
	moveDirection: Dir;
	constructor(pos: TilePos) {
		this.pos = new TilePos(pos);
		this.job = null;
		this.item = null;
	}
	tick() {

		if (this.moveDelay > 0) {
			this.moveDelay--;
			if (this.moveDelay == 0) {
				this.pos.move(this.moveDirection);
				if (this.item) {
					this.item.pos = this.pos.mid();
				}
			} else {
				return;

			}
		}

		let path: Path | null = null;

		if (!this.job && this.item) {
			if (!this.item.request) {
				this.dropItem();
				return;
			}
			if (this.pos.distance(this.item.request.target.pos) <= 1) {
				this.item.request.deliverItem(this.item);
				return;
			}
			path = Path.generate(this.pos, this.item.request.target.pos);
		} else if (!this.job) {
			path = this.findJob();
		}

		if (this.job) {
			if (this.pos.distance(this.job.pos) <= this.job.range) {
				this.job.work();
				return;
			}
			if (!path) {
				path = Path.generate(this.pos, this.job.pos);
			}
		}

		if (!path) {
			// no Path possible => give up on Job
			this.setJob(null);
			this.dropItem();
			return;
		}
		this.moveDirection = path.next;
		this.moveDelay = this.totalMoveDelay = Tile.at(this.pos).getWalkCost();
		this.pathLen = path.length;
	}
	private findJob(): Path | null {
		if (this.item) {
			return null;
		}

		let job = Path
			.gen_all(this.pos, [...Game.jobs], j => j.pos)
			.filter(jp => jp.obj.worker == null || jp.obj.worker.pathLen > jp.path.length + 1)
			.map(({ obj, path }) => ({ obj, rating: path.length + obj.priority * 10, path }))
			.min(jp => jp.rating);

		if (job) {
			this.setJob(job.obj, job.path.length);
			return job.path;
		}
		return null;
	}
	setJob(job: Job | null, pathLen: number = -1) {
		if (this.job) {
			this.job.worker = undefined;
		}
		this.job = job;
		if (job) {
			if (job.worker) {
				job.worker.job = null;
			}
			job.worker = this;
			if (pathLen == -1) {
				const path = Path.generate(this.pos, job.pos);
				this.pathLen = path ? path.length : 0;
			} else {
				this.pathLen = pathLen;
			}
		}
	}
	busy() {
		return this.job != null || this.item != null;
	}
	pickUp(item: Item) {
		if (this.item) {
			this.item.worker = null;
		}
		this.item = item;
		if (item) {
			item.worker = this;
			item.pos = this.pos.mid();
		}
	}
	dropItem() {
		if (this.item) {
			this.item.worker = null;
			if (this.item.request) {
				this.item.request.removeItem(this.item);
			}
		}
		this.item = null;
	}

	remove() {
		if (this.job) {
			this.job.worker = undefined;
			this.job = null;
		}
		Game.workers.remove(this);
		Game.menu.remove(this);
	}

	draw(context: CanvasRenderingContext2D) {
		context.fillStyle = "red";
		const rect = this.getOutline();
		if (this.moveDelay > 0) {
			const progress = 1 - this.moveDelay / this.totalMoveDelay + 1 / this.totalMoveDelay * Game.subTickProgress;
			const current = this.pos.toGamePos();
			const next = this.pos.getInDir(this.moveDirection).toGamePos();
			const offset = next.minus(current).scale(progress);
			context.fillRect(rect.x + offset.x, rect.y + offset.y, rect.width, rect.height);
			if (this.item) {
				this.item.pos = this.pos.mid().plus(offset.x, offset.y);
			}
		} else {
			context.fillRect(rect.x, rect.y, rect.width, rect.height);
		}
	}
	getOutline(): Rect {
		const leftTop = this.pos.toGamePos().plus(SIZE_OFFSET, SIZE_OFFSET);
		const rightBottom = leftTop.plus(Game.cellSize - 2 * SIZE_OFFSET, Game.cellSize - 2 * SIZE_OFFSET);
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
		if (this.moveDelay) {
			info += "Walk Delay: " + this.moveDelay + "\n";
		}
		return info;
	}
	getOptionMenu(workers: Set<Worker>): Option[] {
		return [
			{
				name: "Destroy",
				callback: () => {
					workers.forEach(w => w.remove());
					return true;
				},
				hotkeys: ["backspace", "delete"]
			}
		]
	}
}
