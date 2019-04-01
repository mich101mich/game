
import { Item, ItemType } from "../world/item";
import { Machine } from "../world/machine";
import { Request } from "./items";

export class Resources {
	list: { [index: number]: number } = {};
	display: HTMLDivElement;

	add(resource: ItemType, amount = 1) {
		const prev = this.get(resource);
		this.list[resource] = amount + prev;
	}
	get(resource: ItemType) {
		return this.list[resource] || 0;
	}
	remove(resource: ItemType, amount: number) {
		this.list[resource] = Math.max(0, this.get(resource) - amount)
	}
	spawnItem(type: ItemType, request: Request, spawn?: Machine): Item | null {
		if (this.get(type) == 0) {
			return null;
		}
		throw new Error("Not implemented!");
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
}
