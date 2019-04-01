
import { Machine, MachineType } from "../machine";
import { Collection } from "./collection";
import { TilePos } from "../geometry/pos";
import { ItemType } from "../item";
import { Game } from "../game";

export class Machines implements Iterable<Machine>{
	private map: { [index: string]: Machine } = {};
	private list = new Set<Machine>();

	[Symbol.iterator](): Iterator<Machine> {
		return this.list[Symbol.iterator]();
	}

	get count() {
		return this.list.size;
	}
	contains(element: Machine) {
		return this.list.has(element);
	}

	add(element: Machine): boolean {
		if (this.map[element.pos.toString()]) {
			return false;
		}
		this.map[element.pos.toString()] = element;
		const length = this.count;
		return this.list.add(element).size > length;
	}

	remove(element: Machine): boolean {
		delete this.map[element.pos.toString()];
		return this.list.delete(element);
	}

	spawns(): Machine[] {
		return [...this].filter(m => m.type == MachineType.Spawn);
	}

	at(pos: TilePos): Machine;
	at(x: number, y: number): Machine;
	at(pos: TilePos | number, y: number = 0): Machine {
		if (!(pos instanceof TilePos)) {
			pos = new TilePos(pos, y);
		}
		return this.map[pos.toString()];
	}
}
