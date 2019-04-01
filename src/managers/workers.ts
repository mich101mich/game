
import { Worker } from "../worker";
import { Collection } from "./collection";

export class Workers extends Collection<Worker> {
	constructor() {
		super(20);
	}
}