
import { Game } from "../game";
import { Tile } from "../tile";
import { Job } from "./job";

export class RemoveDebrisJob extends Job {
	constructor(tile: Tile, priority = 4) {
		const material = tile.type;
		super(
			tile.pos,
			{
				range: 0,
				priority,
				duration: Math.max(1, tile.getStrength() - Game.drillSpeed * 2)
			},
			() => tile.remove(),
			() => tile.type == material);
	}
}
