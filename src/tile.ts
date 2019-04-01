
import { Game } from "./game";
import { Rect, TilePos } from "./geometry/mod";
import { Item, ItemType } from "./item";
import { PickupItemJob, RemoveTileJob, RemoveDebrisJob } from "./jobs/mod";
import { MACHINE_DATA, Machine, MachineType } from "./machine";
import { Option, Selectable } from "./menu";

export enum TileType {
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
	pos: TilePos;
	rect: Rect;
	private constructor(pos: TilePos) {
		this.pos = new TilePos(pos);
		this.rect = new Rect(
			this.pos.toGamePos(),
			this.pos.plus(1, 1).toGamePos());
	}
	get type(): TileType {
		return Game.wasm.get(this.pos.x, this.pos.y);
	}
	getData() {
		return TILE_DATA[this.type];
	}
	getStrength(): number {
		return this.getData().strength;
	}
	isSolid(): boolean {
		return Game.wasm.is_solid(this.pos.x, this.pos.y);
	}
	getWalkCost(): number {
		return Game.wasm.walk_cost(this.pos.x, this.pos.y);
	}
	isVisible(): boolean {
		return Game.wasm.is_visible(this.pos.x, this.pos.y);
	}
	isSelectable(): boolean {
		return this.getData().selectable;
	}
	isDrillable(): boolean {
		return this.getData().drillLevel !== undefined && this.getData().drillLevel <= Game.drillLevel;
	}
	remove() {
		const drops = this.getData().drops || [];
		for (const drop of drops) {
			if (Math.random() < drop.probability) {
				const pos = this.pos.mid().plus(Math.random() * 12 - 6, Math.random() * 12 - 6);
				Game.items.create(pos, drop.item);
			}
		}
		if (this.getData().leavesDebris) {
			Game.place(this.pos, TileType.Debris);
			Game.jobs.add(new RemoveDebrisJob(this));
		} else {
			Game.place(this.pos, TileType.Air);
		}
	}
	getOutline(): Rect {
		return this.rect;
	}
	getDescription(): string {
		return `${TileType[this.type]}`;
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
						if (tile.type == TileType.Debris) {
							Game.jobs.add(new RemoveDebrisJob(tile, 0));
						} else {
							Game.jobs.add(new RemoveTileJob(tile));
						}
					}
					return true;
				},
				hotkeys: ["d"],
			});
		} else if (this.type == TileType.Air) {
			MACHINE_DATA
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
					hotkeys: [],
				}))
				.forEach(o => options.push(o))
		}
		return options;
	}
	static at(x: number, y: number): Tile;
	static at(pos: TilePos): Tile;
	static at(pos: number | TilePos, y?: number) {
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

