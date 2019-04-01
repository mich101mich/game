
import { Cost } from "../cost";
import { Game } from "../game";
import { GamePos, Path } from "../geometry/mod";
import { Item, ItemType } from "../item";
import { PickupItemJob } from "../jobs/mod";
import { Machine } from "../machine";
import { Collection } from "./collection";
import { ResourceListener } from "./mod";

export class Items extends Collection<Item> implements ResourceListener {

	requests = new Array<Request>();
	unresolved = new Array<{ request: Request, type: ItemType, amount: number }>();

	request(machine: Machine, cost: Cost, priority = 0) {
		this.requests.push(new Request(machine, cost, priority));
	}

	create(pos: GamePos, type: ItemType, request?: Request): Item {

		if (!request) {
			const wanted = this.unresolved.filter(r => r.type == type);

			const target = Path
				.best(
					pos.toTilePos(),
					wanted,
					w => w.request.target.pos,
					(o, l) => l + o.request.priority * 10);

			if (target) {
				request = target.request;
				if (--target.amount == 0) {
					this.unresolved.remove(target);
				}
			} else {
				request = this.unresolved.find(u => u.amount == Infinity).request;
			}
		}
		const item = new Item(pos, type, request);
		Game.jobs.add(new PickupItemJob(item));

		this.add(item);
		return item;
	}
	onAdd(type: ItemType, prev: number, now: number): void {
		const wanted = this.unresolved
			.filter(u => u.type == type && u.amount != Infinity);

		if (wanted.length == 0) {
			return;
		}

		let amount = now;

		while (amount > 0 && wanted.length > 0) {
			const w = wanted.min(o => o.request.priority);
			const taken = Math.min(w.amount, amount);
			for (let i = 0; i < taken; i++) {
				Game.resources.spawnItem(type, w.request);
			}
			amount -= taken;
		}
	}
	onRemove(type: ItemType, prev: number, now: number): void {
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

		this.cost.amount.forEach((count, type) => {
			this.requestItem(type, count);
		});
	}
	private requestItem(type: ItemType, count: number): Item {
		const items = [...Game.items]
			.filter(item => item.type == type)
			.filter(item => item.request == null
				|| item.request.priority >= this.priority);

		let spawns: (Item | Machine)[] = [];
		if (this.priority < 100 && Game.resources.get(type) > 0) {
			spawns = Game.machines.spawns().filter(s => s.freeNeighbour() != null);
		}
		const sources = spawns.concat(items);

		if (sources.length == 0) {
			Game.items.unresolved.push({ request: this, type, amount: count });
			return;
		}

		const sourcePaths = Path
			.gen_all(this.target.pos, sources, t => t.pos.toTilePos())
			.sort((a, b) => a.path.length - b.path.length);

		while (count > 0 && sourcePaths.length > 0) {
			const source = sourcePaths[0].obj;
			let item;
			if (source instanceof Machine) {
				if (Game.resources.get(type) == 0) {
					sourcePaths.removeAt(0);
					continue;
				}
				item = Game.resources.spawnItem(type, this, source);
			} else {
				if (source.request) {
					const path = Path.generate(source.pos.toTilePos(), source.request.target.pos);
					if (path && sourcePaths[0].path.length > path.length + (source.request.priority - this.priority) * 10) {
						sourcePaths.removeAt(0);
						continue;
					}
					// don't use the removeItem() method -> recursion
					source.request.items.remove(source);
				}
				item = source;
				sourcePaths.removeAt(0);
			}
			item.request = this;
			Game.jobs.add(new PickupItemJob(item));
			count--;
		}
		if (count == 0) {
			return;
		}
		Game.items.unresolved.push({ request: this, type, amount: count });
	}
	deliverItem(item: Item) {
		this.cost.remove(item.type);
		this.target.requestedItemDelivered(item.type);
		this.items.remove(item);
		item.remove();
		if (this.cost.isDone()) {
			Game.items.requests.remove(this);
			this.target.requestComplete();
		}
	}
	removeItem(item: Item) {
		if (this.items.remove(item)) {
			this.requestItem(item.type, 1);
		}
	}
}
