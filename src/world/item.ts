
import { GamePos } from "../geometry/pos";
import { Rect } from "../geometry/rect";
import { Option, Selectable } from "../menu";
import { Worker } from "./worker";

export enum ItemType {
	Ore,
	Crystal,
}

export class Item implements Selectable {
	pos: GamePos;
	type: ItemType;
	worker: Worker | null = null;
	request: Request;
	constructor(pos: GamePos, type: ItemType, request: Request) {
		this.type = type;
		this.pos = pos;
		this.request = request;
	}

	animationUpdate(subTickProgress: number) {
		if (this.worker) {
			this.pos.set(this.worker.absolutePosition)
		}
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
