
import { Game } from "../game";

export enum Dir {
	UP = 0,
	RIGHT = 1,
	DOWN = 2,
	LEFT = 3,
	NONE = 4,
}

class Pos {
	x: number;
	y: number;
	/**
	 * creates a new Pos
	 * @param x the x coordinate
	 * @param y the y coordinate
	 */
	constructor(x: number, y: number);
	/**
	 * creates a new Pos and converts if necessary
	 * @param src the source Pos
	 */
	constructor(src: TilePos);
	/**
	 * creates a new Pos and converts if necessary
	 * @param src the source Pos
	 */
	constructor(src: GamePos);

	constructor(x: number | Pos, y?: number) {
		this.set(x, y);
	}

	/**
	 * sets this to x, y or x.x, x.y
	 * converts Coordinate Spaces if necessary
	 * @param x the x coordinate or source Pos
	 * @param y the y coordinate
	 */
	set(x: number | Pos = 0, y: number = 0): void {
		if (!(x instanceof Pos)) {
			this.x = x;
			this.y = y;
			return;
		}
		let pos: Pos;
		if (this instanceof GamePos) {
			pos = x.toGamePos();
		} else if (this instanceof TilePos) {
			pos = x.toTilePos();
		} else {
			pos = x;
		}
		this.x = pos.x;
		this.y = pos.y;
	}
	/**
	 * moves this Pos by steps in dir
	 * @param dir the direction
	 * @param steps the number of steps
	 */
	move(dir: Dir, steps: number = 1) {
		this.x += Pos.deltaX[dir] * steps;
		this.y += Pos.deltaY[dir] * steps;
		return this;
	}
	/**
	 * checks if this and other have the same x and y
	 * @param other the Pos to compare to
	 */
	equals(other: Pos): boolean {
		return this.x === other.x && this.y === other.y;
	}
	dirTo(other: Pos): Dir {
		if (other.x > this.x) {
			return Dir.RIGHT;
		} else if (other.x < this.x) {
			return Dir.LEFT;
		} else if (other.y > this.y) {
			return Dir.DOWN;
		} else {
			return Dir.UP;
		}
	}
	xy() {
		return [this.x, this.y];
	}
	toString(): string {
		return "(" + this.x + ", " + this.y + ")";
	}
	toTilePos(): TilePos {
		return new TilePos(this.x, this.y);
	}
	toGamePos(): GamePos {
		return new GamePos(this.x, this.y);
	}

	protected static deltaX = [0, 1, 0, -1, 0];
	protected static deltaY = [-1, 0, 1, 0, 0];
}

/**
 * a Class to represent Coordinates of Tiles
 */
export class TilePos extends Pos {
	isValid(): boolean {
		return this.x >= 0
			&& this.y >= 0
			&& this.x < Game.TILE_WIDTH
			&& this.y < Game.TILE_HEIGHT;
	}
	plus(pos: TilePos): TilePos;
	plus(x: number, y: number): TilePos;
	plus(x: TilePos | number, y: number = 0): TilePos {
		if (x instanceof TilePos) {
			return new TilePos(this.x + x.x, this.y + x.y);
		} else {
			return new TilePos(this.x + x, this.y + y);
		}
	}
	minus(pos: TilePos): TilePos;
	minus(x: number, y: number): TilePos;
	minus(x: TilePos | number, y: number = 0): TilePos {
		if (x instanceof TilePos) {
			return new TilePos(this.x - x.x, this.y - x.y);
		} else {
			return new TilePos(this.x - x, this.y - y);
		}
	}
	scale(factor: number) {
		return new TilePos(this.x * factor, this.y * factor);
	}
	toTilePos(): TilePos {
		return this;
	}
	/**
	 * returns a new Pos that is moved by in dir
	 * @param dir the direction
	 */
	getInDir(dir: Dir): TilePos {
		return new TilePos(this).move(dir);
	}
	toGamePos(): GamePos {
		const pos = this.scale(Game.cellSize);
		return new GamePos(pos.x, pos.y);
	}
	/**
	 * returns the Manhattan distance between this and other
	 * @param other the other Pos
	 */
	distance(other: TilePos): number {
		return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
	}
	mid(): GamePos {
		return this.plus(0.5, 0.5).toGamePos();
	}
}

/**
 * a Class to represent Pixel Coordinates on the Game field
 */
export class GamePos extends Pos {
	isValid(): boolean {
		return this.x >= 0
			&& this.y >= 0
			&& this.x < Game.GAME_WIDTH
			&& this.y < Game.GAME_HEIGHT;
	}
	plus(pos: GamePos): GamePos;
	plus(x: number, y: number): GamePos;
	plus(x: GamePos | number, y: number = 0): GamePos {
		if (x instanceof GamePos) {
			return new GamePos(this.x + x.x, this.y + x.y);
		} else {
			return new GamePos(this.x + x, this.y + y);
		}
	}
	minus(pos: GamePos): GamePos;
	minus(x: number, y: number): GamePos;
	minus(x: GamePos | number, y: number = 0): GamePos {
		if (x instanceof GamePos) {
			return new GamePos(this.x - x.x, this.y - x.y);
		} else {
			return new GamePos(this.x - x, this.y - y);
		}
	}
	scale(factor: number) {
		return new GamePos(this.x * factor, this.y * factor);
	}
	/**
	 * returns the Euclidean distance between this and other
	 * @param other the other Pos
	 */
	distance(other: GamePos): number {
		return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
	}
	floor() {
		return new GamePos(Math.floor(this.x), Math.floor(this.y));
	}
	toTilePos(): TilePos {
		const pos = this.scale(1 / Game.cellSize).floor();
		return new TilePos(pos.x, pos.y);
	}
	toGamePos(): GamePos {
		return this;
	}
}
