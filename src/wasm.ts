
import { Dir } from "./geometry/mod";
import { TileType } from "./tile";

export interface Wasm {
	memory: { buffer: ArrayBuffer };
	/**
	 * generates a Path from start to end
	 * @param sx start x
	 * @param sy start y
	 * @param ex end x
	 * @param ey end y
	 * @returns -1 if no Path found. -2 on internal error. otherwise: (length << 2) | nextDirection
	 */
	find_path(sx: number, sy: number, ex: number, ey: number): number;
	/**
	 * checks if a tile is solid
	 * @param x the x coordinate
	 * @param y the y coordinate
	 */
	is_solid(x: number, y: number): boolean;
	/**
	 * gets the walk cost of a tile
	 * @param x the x coordinate
	 * @param y the y coordinate
	 */
	walk_cost(x: number, y: number): number;
	/**
	 * @param x the x coordinate
	 * @param y the y coordinate
	 */
	get(x: number, y: number): TileType;
	/**
	 * @param x the x coordinate
	 * @param y the y coordinate
	 * @param value the new Value
	 */
	set(x: number, y: number, value: TileType): void;
	/**
	 * initializes the area. Please only call once!
	 * @param width the Width of the area
	 * @param height the height of the area
	 */
	init(width: number, height: number): void;
	/**
	 * @param x the x coordinate
	 * @param y the y coordinate
	 */
	is_visible(x: number, y: number): boolean;
	/**
	 * @param x the x coordinate
	 * @param y the y coordinate
	 */
	set_visible(x: number, y: number): void;

	add_flood_goal(goalX: number, goalY: number): void;
	flood_search(startX: number, startY: number): void;
	flood_path_to(goalX: number, goalY: number): number;
	end_flood_search(): void;

	gen_hpa_map(): void;
	chunk_size(): number;

	iter_links(): void;
	link_x(): number;
	link_y(): number;
	link_id(): number;
	next_link(): boolean;

	connection_x(): number;
	connection_y(): number;
	connection_cost(): number;
	next_connection(): boolean;
}

