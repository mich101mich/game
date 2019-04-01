
import { Worker } from "../world/worker";
import { Collection } from "./collection";

export class Workers extends Collection<Worker> {
	constructor() {
		super(20);
	}
}