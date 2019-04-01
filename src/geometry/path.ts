
import { Dir, TilePos } from "./pos";

export class Path {
	start: TilePos;
	end: TilePos;
	length: number;
	next: Dir;
	/**
	 * creates a new Path with the given Points
	 * @param length the length
	 * @param next the next step in the path
	 */
	constructor(start: TilePos, end: TilePos, length: number, next: Dir) {
		this.start = new TilePos(start);
		this.end = new TilePos(end);
		this.length = length;
		this.next = next;
	}
}
