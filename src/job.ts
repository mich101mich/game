
import { TilePos } from "./geometry/pos";
import { ItemType } from "./world/item";
import { TileType } from "./world/tile";
import { Worker } from "./world/worker";

export interface TileRequirement {
	pos: TilePos,
	type?: TileType | TileType[],
	solid?: boolean,
}

export interface Requirements {
	emptyHand?: boolean,
	item?: ItemType,
	tile?: TileRequirement | TileRequirement[],
	previousJobs?: Job[],
}

export class Job {
	pos: TilePos;
	range: number;
	duration: number;
	priority: number;
	requirements: Requirements;

	onFinished: (worker: Worker) => void;

	constructor(
		data: {
			pos: TilePos,
			range?: number,
			duration: number,
			priority?: number,
			requirements?: Requirements,
			followUpJobs?: Job[],
		},
		onFinished: (worker: Worker) => void,
	) {
		this.pos = data.pos;
		this.range = data.range || 0;
		this.duration = data.duration;
		this.priority = data.priority || 0;
		this.requirements = data.requirements || {};
		this.onFinished = onFinished;
	}
}
