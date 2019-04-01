
import { Cost } from "./cost";
import { Path } from "./geometry/path";
import { TilePos } from "./geometry/pos";
import { Job, Requirements, TileRequirement } from "./job";
import { Items } from "./managers/items";
import { Machines } from "./managers/machines";
import { Resources } from "./managers/resources";
import { Workers } from "./managers/workers";
import { ItemType } from "./world/item";
import { Machine, MachineOptions, MachineType } from "./world/machine";
import { Tile } from "./world/tile";
import { World } from "./world/world";
import { Worker } from "./world/worker";

class Task {
	worker: Worker;
	job: Job;
	path: Path;
	startTime: number;

	constructor(worker: Worker, job: Job, path: Path, startTime: number) {
		this.worker = worker;
		this.job = job;
		this.path = path;
		this.startTime = startTime;
	}
	endTime(): number {
		return this.startTime + this.path.length + this.job.duration;
	}
}

export class Scheduler {
	schedule = new Map<Worker, Task[]>();
	tasks = new Set<Task>();
	time = 0;

	workers = new Workers();
	items = new Items();
	resources = new Resources();
	machines = new Machines();
	requests: Cost[] = [];
	unassigned: Job[] = [];

	constructor() {
	}

	tick() {
		this.time++;

		const free = new Set<Worker>();
		const busy = new Set<Worker>();

		for (const worker of this.workers) {
			if (worker.isMoving()) {
				worker.updateMovement();
				continue;
			}
			const schedule = this.schedule.get(worker);
			if (!schedule || schedule.length == 0) {
				free.add(worker);
				continue;
			}
			const task = schedule[0];
			if (!Scheduler.stillValid(task)) {
				schedule.length = 0;
				free.add(worker);
				continue;
			}
			busy.add(worker);
		}

		for (const worker of busy) {
			const schedule = this.schedule.get(worker);
			if (schedule === undefined) {
				throw new Error("Worker does not exist");
			}
			const task = schedule[0];
			if (worker.pos.distance(task.job.pos) <= task.job.range) {
				task.job.onFinished(worker);
				schedule.removeAt(0);
			} else {
				const path = World.genPath(worker.pos, task.job.pos);
				if (!path) {
					// TODO: Path is now obstructed, find alternative
					throw new Error("TODO");
				}
				task.path = path;
				worker.setMovement(path.next, Tile.at(worker.pos).getWalkCost());
			}
		}
		if (this.unassigned.length > 0 && free.size > 0) {
			const workers = [...free];
			const paths = World.genPaths(workers.map(w => w.pos), this.unassigned.map(j => j.pos));

			let associations: { worker: Worker, job: Job, path: Path }[] = [];

			for (const worker of workers) {
				const my_paths = paths.get(worker.pos);
				if (!my_paths) {
					throw new Error("Worker in invalid Pos");
				}
				for (const job of this.unassigned) {
					const path = my_paths.get(job.pos);
					if (path && Scheduler.checkRequirements(job.requirements, worker)) {
						associations.push({ worker, path, job });
					}
				}
			}
			associations.sort((a, b) => a.path.length - b.path.length);

			while (associations.length > 0) {
				const min = associations.splice(0, 1)[0];

				const task = new Task(min.worker, min.job, min.path, this.time);
				this.addTask(task);
				associations = associations.filter(
					({ worker, job }) => worker !== min.worker && job !== min.job);
			}
		}

	}

	private static stillValid(task: Task): boolean {
		return Scheduler.checkRequirements(task.job.requirements, task.worker);
	}
	private static checkRequirements(requirements: Requirements, worker: Worker): boolean {
		if (requirements.emptyHand && worker.item) {
			return false;
		}
		if (requirements.item !== undefined && (!worker.item || requirements.item != worker.item.type)) {
			return false;
		}
		if (requirements.tile !== undefined) {
			if (requirements.tile instanceof Array) {
				if (!requirements.tile.every(Scheduler.checkTileRequirements)) {
					return false;
				}
			} else {
				if (!Scheduler.checkTileRequirements(requirements.tile)) {
					return false;
				}
			}
		}
		return true;
	}
	private static checkTileRequirements(req: TileRequirement): boolean {
		const tile = Tile.at(req.pos);
		if (req.solid !== undefined && req.solid != tile.isSolid()) {
			return false;
		}
		if (req.type !== undefined) {
			if (req.type instanceof Array) {
				if (req.type.indexOf(tile.type) == -1) {
					return false;
				}
			} else {
				if (req.type != tile.type) {
					return false;
				}
			}
		}
		return true;
	}

	nextAvailable(worker: Worker): number {
		const schedule = this.schedule.get(worker);
		if (schedule) {
			return schedule.map(task => task.endTime()).max();
		}
		return this.time;
	}

	addWorker(pos: TilePos): boolean {
		return this.workers.add(new Worker(this, pos));
	}
	removeWorker(worker: Worker): boolean {
		return this.workers.remove(worker);
	}

	addMachine(pos: TilePos, type: MachineType, options: MachineOptions = {}): boolean {
		return this.machines.add(new Machine(this, pos, type, options));
	}
	removeMachine(machine: Machine): boolean {
		return this.machines.remove(machine);
	}

	addJob(job: Job) {
		this.unassigned.push(job);
	}
	private addTask(task: Task) {
		this.tasks.add(task);
		const currentSchedule = this.schedule.get(task.worker);
		if (!this.schedule.has(task.worker)) {
			this.schedule.set(task.worker, [task]);
		} else {
			this.schedule.get(task.worker)!.push(task);
		}
	}

	animationUpdate(subTickProgress: number) {
		for (const worker of this.workers) {
			worker.animationUpdate(subTickProgress);
		}
	}
	countResource(type: ItemType): number {
		return this.resources.get(type);
	}

	request(cost: Cost) {
		this.requests.push(cost);
	}
	isAvailable(cost: Cost): boolean {
		for (const type of cost.amount.keys()) {
			if (this.resources.get(type) < cost.amount.get(type)!) {
				return false;
			}
		}
		return true;
	}
	pay(cost: Cost) {
		for (const type of cost.amount.keys()) {
			this.resources.remove(type, cost.amount.get(type)!);
		}
	}

}
