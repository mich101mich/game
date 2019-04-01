
import { ItemType } from "./world/item";

export class Cost {
	amount = new Map<ItemType, number>();
	constructor(src: { ore?: number, crystal?: number } | Cost) {
		if (src instanceof Cost) {
			src.amount.forEach((count, type) => this.amount.set(type, count));
		} else {
			if (src.ore) {
				this.amount.set(ItemType.Ore, src.ore);
			}
			if (src.crystal) {
				this.amount.set(ItemType.Crystal, src.crystal);
			}
		}
	}
	display() {
		if (this.amount.size == 0) {
			return "";
		}
		return "("
			+ [...this.amount.entries()]
				.map(([type, count]) => count + " " + ItemType[type])
				.join(", ")
			+ ")";
	}
	remove(type: ItemType, count = 1) {
		let current = this.amount.get(type);
		if (current === undefined) {
			throw new Error("Attempt to remove non-available ItemType " + ItemType[type] + " from " + this);
		}
		current = Math.max(0, current - count);
		if (current == 0) {
			this.amount.delete(type);
		} else {
			this.amount.set(type, current);
		}
	}
	isDone() {
		return this.amount.size == 0;
	}
}
