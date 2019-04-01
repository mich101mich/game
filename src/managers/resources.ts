
import { Game } from "../game";
import { Item, ItemType } from "../item";
import { Machine } from "../machine";
import { Request } from "./items";
import { Path } from "../geometry/mod";

export interface ResourceListener {
	onAdd(type: ItemType, prev: number, now: number): void;
	onRemove(type: ItemType, prev: number, now: number): void;
}

export class Resources {
	list: { [index: number]: number } = {};
	display: HTMLDivElement;
	listeners: ResourceListener[] = [];

	add(resource: ItemType, amount = 1) {
		const prev = this.get(resource);
		this.list[resource] = amount + prev;
		for (const listener of this.listeners) {
			if (this.list[resource] == prev) {
				break;
			}
			listener.onAdd(resource, prev, this.get(resource));
		}
	}
	get(resource: ItemType) {
		return this.list[resource] || 0;
	}
	remove(resource: ItemType, amount: number) {
		const prev = this.get(resource);
		this.list[resource] = Math.max(0, this.get(resource) - amount)
		for (const listener of this.listeners) {
			if (this.get(resource) == prev) {
				break;
			}
			listener.onRemove(resource, prev, this.get(resource));
		}
	}
	spawnItem(type: ItemType, request: Request, spawn?: Machine): Item {
		if (this.get(type) == 0) {
			return null;
		}
		if (!spawn) {
			const spawns = Game.machines.spawns()
				.filter(s => s.freeNeighbour() != null);

			spawn = Path.nearest(request.target.pos, spawns, s => s.pos);
		}

		if (!spawn) {
			return null;
		}
		this.remove(type, 1);
		return Game.items.create(spawn.freeNeighbour().mid(), type, request);
	}
	draw() {
		let text = "";
		for (const name in this.list) {
			const res = parseInt(name) as ItemType;
			text += ItemType[res] + ": " + this.get(res) + "\n";
		}
		if (text) {
			if (text[text.length - 1] != "\n") {
				text += "\n";
			}
			text += "--------------------"
		}
		this.display.innerText = text;
	}

	addListener(listener: ResourceListener) {
		this.listeners.push(listener);
	}

	removeListener(listener: ResourceListener) {
		this.listeners.remove(listener);
	}

}
