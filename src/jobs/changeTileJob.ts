
import { Game } from "../game";
import { Tile, TileType } from "../tile";
import { Job } from "./job";

export class ChangeTileJob extends Job {
	constructor(tile: Tile, target: TileType, duration: number) {
		const material = tile.type;
		super(
			tile.pos,
			{
				range: 1,
				duration
			},
			() => Game.place(tile.pos, target),
			() => tile.type == material);
	}
}
