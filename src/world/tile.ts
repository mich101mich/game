import { Game } from "../game";
import { TilePos } from "../geometry/pos";
import { Rect } from "../geometry/rect";
import { Job } from "../job";
import { Option, Selectable } from "../menu";
import { ItemType } from "./item";
import { BUILD_COSTS, Machine, MachineType } from "./machine";
import { Wasm } from "../main";


export enum Material {
	Air,
	Bedrock,
	Granite,
	Rock,
	Ore,
	Crystal,
	Debris,
	Platform,
	Machine,
}

export class Tile implements Selectable {
	static wasm: Wasm;
	pos: TilePos;
	rect: Rect;
	private constructor(pos: TilePos) {
		this.pos = new TilePos(pos);
		this.rect = new Rect(
			this.pos.toGamePos(),
			this.pos.plus(1, 1).toGamePos());
	}
	get type(): Material {
		return Tile.wasm.get(this.pos.x, this.pos.y);
	}
	getData() {
		return TILE_DATA[this.type];
	}
	getStrength(): number {
		return this.getData().strength;
	}
	isSolid(): boolean {
		return Tile.wasm.is_solid(this.pos.x, this.pos.y);
	}
	getWalkCost(): number {
		return Tile.wasm.walk_cost(this.pos.x, this.pos.y);
	}
	isVisible(): boolean {
		return Tile.wasm.is_visible(this.pos.x, this.pos.y);
	}
	isSelectable(): boolean {
		return this.getData().selectable;
	}
	isDrillable(): boolean {
		const drillLevel = this.getData().drillLevel;
		return drillLevel !== undefined && drillLevel <= Game.drillLevel;
	}
	getOutline(): Rect {
		return this.rect;
	}
	getDescription(): string {
		return `${Material[this.type]}`;
	}
	getInfo(): string {
		return ``;
	}
	getOptionMenu(tiles: Set<Tile>): Option[] {
		let options: Option[] = [];

		if (this.isDrillable()) {
			options.push({
				name: "Mark for Drill",
				callback: () => {
					for (const tile of tiles) {
						const job = new Job(
							{
								pos: tile.pos,
								range: 1,
								duration: tile.getData().strength,
								requirements: {
									emptyHand: true,
									tile: {
										pos: tile.pos,
										type: tile.type,
									}
								},
							},
							() => Game.place(tile.pos, Material.Debris)
						);
						Game.scheduler.addJob(job);
					}
					return true;
				},
			});
		} else if (this.type == Material.Air) {
			BUILD_COSTS
				.map((data, type) => ({ data, type: type as MachineType }))
				.filter(d => d.data.buildable)
				.map(data => ({
					name: "Build " + MachineType[data.type],
					callback: () => {
						for (const tile of tiles) {
							Machine.constructMachine(tile.pos, data.type);
						}
						return true;
					},
				}))
				.forEach(o => options.push(o))
		}
		return options;
	}
	static at(x: number, y: number): Tile;
	static at(pos: TilePos): Tile;
	static at(pos: number | TilePos, y: number = 0) {
		if (!(pos instanceof TilePos)) {
			pos = new TilePos(pos, y);
		}
		if (!pos.isValid()) {
			return null;
		}
		if (!Tile.tiles[pos.x]) {
			Tile.tiles[pos.x] = [];
		}
		if (!Tile.tiles[pos.x][pos.y]) {
			Tile.tiles[pos.x][pos.y] = new Tile(pos);
		}
		return Tile.tiles[pos.x][pos.y];
	}
	private static tiles: Tile[][] = [];
}

export const TILE_DATA: {
	[index: number]: {
		name: string,
		strength: number,
		drillLevel?: number,
		selectable: boolean,
		leavesDebris: boolean,
		drops?: { item: ItemType, probability: number }[]
	}
} = [
		{
			name: "Air",
			strength: -1,
			selectable: true,
			leavesDebris: false,
		},
		{
			name: "Bedrock",
			strength: -1,
			selectable: false,
			leavesDebris: false,
		},
		{
			name: "Granite",
			strength: 20,
			drillLevel: 1,
			selectable: true,
			leavesDebris: true,
			drops: [
				{ item: ItemType.Ore, probability: 0.1 },
				{ item: ItemType.Crystal, probability: 0.05 },
			]
		},
		{
			name: "Stone",
			strength: 4,
			drillLevel: 0,
			selectable: true,
			leavesDebris: true,
			drops: [
				{ item: ItemType.Ore, probability: 0.2 },
				{ item: ItemType.Crystal, probability: 0.05 },
			]
		},
		{
			name: "Ore",
			strength: 7,
			drillLevel: 0,
			selectable: true,
			leavesDebris: true,
			drops: [
				{ item: ItemType.Ore, probability: 1.0 },
				{ item: ItemType.Ore, probability: 1.0 },
				{ item: ItemType.Ore, probability: 0.25 },
				{ item: ItemType.Ore, probability: 0.1 },
			]
		},
		{
			name: "Crystal",
			strength: 6,
			drillLevel: 0,
			selectable: true,
			leavesDebris: true,
			drops: [
				{ item: ItemType.Crystal, probability: 1.0 },
				{ item: ItemType.Crystal, probability: 1.0 },
				{ item: ItemType.Crystal, probability: 0.3 },
				{ item: ItemType.Crystal, probability: 0.1 },
			]
		},
		{
			name: "Debris",
			strength: 5,
			drillLevel: 0,
			selectable: true,
			leavesDebris: false,
			drops: [
				{ item: ItemType.Ore, probability: 1.0 },
				{ item: ItemType.Ore, probability: 0.1 },
			]
		},
		{
			name: "Platform",
			strength: -1,
			selectable: false,
			leavesDebris: true,
		},
		{
			name: "Machine",
			strength: -1,
			selectable: false,
			leavesDebris: false,
		}
	];

