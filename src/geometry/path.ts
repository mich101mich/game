
import { Dir, TilePos } from "./pos";
import { RustPath } from "../main";

export class Path {
	path: TilePos[];
	cost: number;
	/**
	 * creates a new Path with the given Points
	 * @param length the length
	 * @param next the next step in the path
	 */
	constructor(path: RustPath) {
		this.path = path.path.map(({ x, y }) => new TilePos(x, y));
		this.cost = path.cost;
	}

	nextDir(): Dir {
		if (this.path.length < 2) {
			return Dir.NONE;
		}
		return this.path[0].dirTo(this.path[1]);
	}
}
