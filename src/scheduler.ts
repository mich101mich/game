import { Worker } from "./worker";
import { Job } from "./jobs/mod";
import { Path } from "./geometry/mod";

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
}

export class Scheduler {

	schedule: Map<Worker, Task[]>;

	update() {



	}
}
