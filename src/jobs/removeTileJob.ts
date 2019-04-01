
import { Game } from "../game";
import { Tile } from "../tile";
import { Job } from "./job";

export class RemoveTileJob extends Job {
	constructor(tile: Tile) {
		const material = tile.type;
		super(
			tile.pos,
			{
				range: 1,
				duration: Math.max(1, tile.getStrength() - Game.drillSpeed * 2)
			},
			() => tile.remove(),
			() => tile.type == material);
	}
}
