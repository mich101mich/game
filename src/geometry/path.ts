
import { Game } from "../game";
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
	constructor(start: TilePos, end: TilePos, length: number = 0, next: Dir = Dir.NONE) {
		this.start = new TilePos(start);
		this.end = new TilePos(end);
		this.length = length;
		this.next = next;
	}

	/**
	 * tries to generate a path from start to end
	 * @param start the start Point
	 * @param end the end Point
	 */
	static generate(start: TilePos, end: TilePos): Path | null {
		if (start.x == end.x && start.y == end.y) {
			return new Path(start, end, 0);
		}
		if (!start.isValid() || !end.isValid()) {
			return null;
		}
		let length = Game.wasm.find_path(start.x, start.y, end.x, end.y);
		if (length < 0) {
			return null;
		}
		const nextDir = length & 0b11;
		length = length >> 2;
		return new Path(start, end, length, nextDir);
	}

	static gen_all<T>(start: TilePos, end: T[], getPos: (t: T) => TilePos): { path: Path, obj: T }[] {
		if (end.length == 0) {
			return [];
		}
		const positions = end.map(obj => ({ obj, end: getPos(obj) }));
		for (const { end } of positions) {
			Game.wasm.add_flood_goal(end.x, end.y);
		}

		Game.wasm.flood_search(start.x, start.y);
		const ret = positions.map(({ obj, end }) => {
			let length = Game.wasm.flood_path_to(end.x, end.y);
			if (length < 0) {
				return null;
			}
			const nextDir = length & 0b11;
			length = length >> 2;
			return {
				obj,
				path: new Path(start, end, length, nextDir)
			};
		})
			.filter((o): o is { obj: T, path: Path } => o != null);

		Game.wasm.end_flood_search();
		return ret;
	}
	static best<T>(start: TilePos, end: T[], getPos: (t: T) => TilePos, rating: (t: T, length: number) => number): T | null {
		const result = this.gen_all(start, end, getPos)
			.min(o => rating(o.obj, o.path.length));
		return result ? result.obj : null;
	}
	static nearest<T>(start: TilePos, end: T[], getPos: (t: T) => TilePos): T | null {
		for (const t of end) {
			if (getPos(t).equals(start)) {
				return t;
			}
		}
		return this.best(start, end, getPos, (t, length) => length);
	}
}
