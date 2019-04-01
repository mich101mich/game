
import { GamePos } from "./pos";

export class Rect {
	x: number;
	y: number;
	width: number;
	height: number;
	constructor(x: number, y: number, width: number, height: number);
	constructor(leftTop: GamePos, width: number, height: number);
	constructor(leftTop: GamePos, rightBottom: GamePos);

	constructor(x: number | GamePos, y: number | GamePos, width: number = 0, height: number = 0) {
		if (x instanceof GamePos) {
			if (y instanceof GamePos) {
				this.x = Math.min(x.x, y.x);
				this.width = Math.max(x.x, y.x) - this.x;
				this.y = Math.min(x.y, y.y);
				this.height = Math.max(x.y, y.y) - this.y;
			} else {
				this.x = x.x;
				this.y = x.y;
				this.width = width;
				this.height = height;
			}
		} else {
			this.x = x;
			this.y = y as number;
			this.width = width;
			this.height = height;
		}
	}
	get left() { return this.x; }
	get top() { return this.y; }
	get right() { return this.x + this.width; }
	get bottom() { return this.y + this.height; }
	leftTop() {
		return new GamePos(this.left, this.top);
	}
	rightBottom() {
		return new GamePos(this.right, this.bottom);
	}

	contains(pos: GamePos): boolean {
		return pos.x >= this.left
			&& pos.y >= this.top
			&& pos.x < this.right
			&& pos.y < this.bottom;
	}
	intersects(other: Rect): boolean {
		return this.left < other.right
			&& other.left < this.right
			&& this.top < other.bottom
			&& other.top < this.bottom;
	}
}
