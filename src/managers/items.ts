
import { Cost } from "../cost";
import { GamePos } from "../geometry/pos";
import { Item, ItemType } from "../world/item";
import { Machine } from "../world/machine";
import { Collection } from "./collection";

export class Items extends Collection<Item> {

	requests = new Array<Request>();
	unresolved = new Array<{ request: Request, type: ItemType, amount: number }>();

	request(machine: Machine, cost: Cost, priority = 0) {
		this.requests.push(new Request(machine, cost, priority));
	}

	create(pos: GamePos, type: ItemType, request?: Request): Item {
		throw new Error("Not implemented!");
	}
}

export class Request {
	target: Machine;
	priority: number;
	cost: Cost;
	items: Item[];
	constructor(target: Machine, cost: Cost, priority = 0) {
		this.target = target;
		this.priority = priority;
		this.cost = cost;
		this.items = [];
	}
}
