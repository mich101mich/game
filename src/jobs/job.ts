
import { Game } from "../game";
import { TilePos } from "../geometry/mod";
import { Worker } from "../worker";

export class Job {
	private _pos: TilePos;
	get pos(): TilePos {
		return this._pos;
	}
	range: number;
	duration: number;
	priority: number;
	worker: Worker;
	resolve: (worker: Worker) => void;
	checkValid: (worker?: Worker) => boolean;
	constructor(
		pos: TilePos,
		data: {
			range?: number,
			duration: number,
			priority?: number,
		},
		resolve: (worker: Worker) => void,
		checkValid: (worker?: Worker) => boolean = (() => true)
	) {
		this._pos = pos;
		this.range = data.range || 0;
		this.duration = data.duration;
		this.priority = data.priority || 0;
		this.worker = null;
		this.resolve = resolve;
		this.checkValid = checkValid;
	}
	hasWorker(): boolean {
		return this.worker !== null;
	}
	isValid(): boolean {
		return this.checkValid(this.worker);
	}
	work() {
		if (!this.isValid()) {
			this.remove();
			return;
		}
		if (this.duration > 0) {
			this.duration--;
			return;
		}
		const worker = this.worker;
		// remove first so resolve can assign a new Job
		this.remove();
		this.resolve(worker);
		return;
	}
	remove() {
		if (this.worker) {
			this.worker.job = null;
			this.worker = null;
		}
		Game.jobs.remove(this);
	}
}
