
import { Game } from "./game";
import { GamePos, Rect } from "./geometry/mod";
import { Machine } from "./machine";
import { Option, Selectable } from "./menu";
import { Worker } from "./worker";
import { Request } from "./managers/mod";

export enum ItemType {
	Ore,
	Crystal,
}

export class Item implements Selectable {
	pos: GamePos;
	type: ItemType;
	worker: Worker = null;
	request: Request;
	constructor(pos: GamePos, type: ItemType, request: Request) {
		this.type = type;
		this.pos = pos;
		this.request = request;
	}

	exists(): boolean {
		return Game.items.contains(this);
	}

	remove() {
		if (this.worker) {
			this.worker.item = null;
			this.worker = null;
		}
		if (this.request) {
			this.request.removeItem(this);
			this.request = null;
		}
		Game.items.remove(this);
		Game.menu.remove(this);
	}

	draw(context: CanvasRenderingContext2D) {
		const data = ITEM_DATA[this.type];
		context.fillStyle = data.color;
		context.beginPath();
		context.ellipse(this.pos.x, this.pos.y, data.size, data.size, 0, 2 * Math.PI, 0);
		context.fill();
	}

	getOutline(): Rect {
		const data = ITEM_DATA[this.type];
		return new Rect(
			this.pos.x - data.size / 2,
			this.pos.y - data.size / 2,
			data.size,
			data.size
		);
	}
	getOptionMenu(items: Set<Item>): Option[] {
		return [
		]
	}
	getDescription(): string {
		return `Item(${ItemType[this.type]})`;
	}
	getInfo(): string {
		return ``;
	}
}

export const ITEM_DATA: {
	[index: number]: {
		size: number,
		color: string | CanvasGradient | CanvasPattern
	}
} = [
		{
			size: 2,
			color: "brown",
		},
		{
			size: 2,
			color: "lime",
		}
	];
