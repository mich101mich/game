
import { Cost } from "./cost";
import { Game } from "./game";
import { Rect, TilePos, Dir } from "./geometry/mod";
import { ItemType } from "./item";
import { Option, Selectable } from "./menu";
import { Tile, TileType } from "./tile";
import { Worker } from "./worker";
import { ResourceListener } from "./managers/mod";

export enum MachineType {
	Spawn,
	Lab,
	ConstructionSite,
	Platform,
}

export const MACHINE_DATA: {
	cost: Cost,
	buildable: boolean
}[] = [
		{ // Spawn
			cost: new Cost({ ore: 5, crystal: 1 }),
			buildable: true,
		},
		{ // Lab
			cost: new Cost({ ore: 15, crystal: 3 }),
			buildable: true,
		},
		{ // ConstructionSite
			cost: new Cost({}),
			buildable: false,
		},
		{ // Platform
			cost: new Cost({ ore: 2 }),
			buildable: true,
		}
	];

type MachineOptions = {
	cost?: Cost,
	result?: MachineType,
	workDone?: () => void,
}

export class Machine implements Selectable, ResourceListener {
	pos: TilePos;
	rect: Rect;
	type: MachineType;
	cooldown: number = 0;
	power: boolean = false;
	level: number = 0;
	options: MachineOptions;
	levelupCost: Cost = new Cost({ ore: 5 });

	constructor(pos: TilePos, type: MachineType, options: MachineOptions = {}) {
		this.pos = new TilePos(pos);
		this.type = type;
		this.options = options;
		this.rect = new Rect(
			this.pos.x * Game.cellSize,
			this.pos.y * Game.cellSize,
			Game.cellSize,
			Game.cellSize);

		if (type == MachineType.Spawn) {
			const cost = new Cost({ ore: Infinity, crystal: Infinity });
			Game.items.request(this, cost, 100);
		} else if (type == MachineType.ConstructionSite) {
			if (options.cost) {
				options.cost.request(this);
			}
		}

		if (type == MachineType.Spawn) {
			if (Game.resources.get(ItemType.Crystal) > 0) {
				this.setPower(true);
			}
			Game.resources.addListener(this);
		} else {
			if (this.neighbourMachines().find(m => m.power)) {
				this.setPower(true);
			}
		}

		if (type == MachineType.Platform) {
			Game.place(pos, TileType.Platform);
		} else {
			Game.place(pos, TileType.Machine);
		}
	}

	tick() {
		if (this.cooldown > 0) {
			this.cooldown--;
			if (this.cooldown == 0 && this.options.workDone) {
				this.options.workDone();
				delete this.options.workDone;
			}
		}
	}

	freeNeighbour(): TilePos {
		for (let i = 0; i < 4; i++) {
			const pos = new TilePos(this.pos);
			pos.move(i);
			if (!Tile.at(pos).isSolid()) {
				return pos;
			}
		}
		return null;
	}

	private neighbourMachines(): Machine[] {
		return [Dir.UP, Dir.RIGHT, Dir.DOWN, Dir.LEFT]
			.map(dir => new TilePos(this.pos).move(dir))
			.map(pos => Game.machines.at(pos))
			.filter(m => m);
	}

	requestedItemDelivered(type: ItemType) {
		if (this.type == MachineType.Spawn) {
			Game.resources.add(type);
		}
	}
	requestComplete() {
		if (this.type == MachineType.ConstructionSite) {
			delete this.options.cost;
			this.cooldown = 5;
			this.options.workDone = () => {
				const result = this.options.result || MachineType.Spawn;
				delete this.options.result;
				this.remove();
				Game.machines.add(new Machine(this.pos, result, this.options));
			}
		}
	}

	givesPower(): boolean {
		if (this.type == MachineType.Spawn && Game.resources.get(ItemType.Crystal) > 0) {
			return true;
		}
		return false;
	}

	conducts(): boolean {
		return this.type != MachineType.ConstructionSite;
	}

	setPower(power: boolean) {
		if (this.power == power) {
			return;
		}
		if (this.givesPower() && !power) {
			return;
		}
		let neighbours = this.neighbourMachines().filter(m => m.conducts());

		if (!power && neighbours.find(m => m.givesPower())) {
			this.power = true;
			neighbours.forEach(m => {
				if (!m.power) {
					m.setPower(true);
				}
			});
			return;
		}

		this.power = power;
		for (const machine of neighbours) {
			machine.setPower(power);
			if (this.power != power) {
				// another machine updated us
				return;
			}
		}
	}
	onAdd(type: ItemType, prev: number, now: number): void {
		if (type == ItemType.Crystal && this.type == MachineType.Spawn && prev == 0) {
			this.setPower(true);
		}
	}
	onRemove(type: ItemType, prev: number, now: number): void {
		if (type == ItemType.Crystal && this.type == MachineType.Spawn && now == 0) {
			this.setPower(false);
		}
	}

	ready(): boolean {
		return this.cooldown == 0 && this.power;
	}

	remove() {
		Game.resources.removeListener(this);
		Tile.at(this.pos).remove();
		Game.machines.remove(this);
		Game.menu.remove(this);

		if (this.power) {
			for (const machine of this.neighbourMachines()) {
				if (machine.conducts()) {
					machine.setPower(false);
				}
			}
		}
	}

	draw(context: CanvasRenderingContext2D) {
		context.drawImage(Game.assets, this.type * 16, 16, 16, 16, this.rect.x, this.rect.y, this.rect.width, this.rect.height);
		if (!this.power && this.conducts()) {
			context.fillStyle = "rgba(0,0,0,0.3)";
			context.fillRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
		}
	}

	getOutline(): Rect {
		return this.rect;
	}
	getDescription(): string {
		return `Machine(${MachineType[this.type]})`;
	}
	getInfo(): string {
		let info = "";
		if (this.type != MachineType.ConstructionSite) {
			info += `\nLevel: ${this.level + 1}`;
		}
		if (this.type == MachineType.ConstructionSite && this.options.cost) {
			info += "\Requires: " + this.options.cost.display();
		}
		if (this.cooldown) {
			info += "\nWork done in " + this.cooldown;
		}
		return info;
	}
	getOptionMenu(machines: Set<Machine>): Option[] {

		const options: Option[] = [
			{
				name: "Destroy",
				callback: () => { this.remove(); return true; },
				hotkeys: ["backspace", "delete"]
			}
		];

		if (this.type != MachineType.ConstructionSite) {
			options.unshift({
				name: "Level up " + this.levelupCost.display(),
				callback: () => {
					this.levelupCost.pay();
					this.options.workDone = () => this.level++;
					this.cooldown = (this.level + 2) * 4;
					this.levelupCost.amount.set(ItemType.Ore, (this.level + 2) * 5);
					return false;
				},
				enabled: () => this.ready() && this.levelupCost.isAvaillable(),
				hotkeys: ["u", "+"]
			});
		}

		if (this.type == MachineType.Spawn) {
			options.unshift({
				name: "Spawn Worker",
				callback: () => {
					this.options.workDone = () => {
						const pos = this.freeNeighbour();
						if (pos) {
							Game.workers.add(new Worker(pos));
						} else {
							alert("Unable to spawn Worker: No free space near Spawn!");
						}
					}
					this.cooldown = Math.max(5, 20 - this.level * 2);
					return false;
				},
				enabled: () => this.ready() && Game.workers.hasRoom() && this.freeNeighbour() != null,
				hotkeys: ["s"]
			});
		} else if (this.type == MachineType.Lab) {
			RESEARCH
				.filter(r => r.availlable())
				.map(r => ({
					name: r.name + "\n" + r.cost.display(),
					callback: () => {
						r.cost.pay();
						this.cooldown = Math.max(5, r.time - this.level * 5);
						this.options.workDone = r.onResearched;
						if (r.costIncrease) {
							r.cost = r.costIncrease(r.cost);
						}
						return false;
					},
					enabled: () => this.ready() && r.cost.isAvaillable() && r.availlable(),
					hotkeys: []
				}))
				.forEach(o => options.push(o))
		}

		return options;
	}

	static constructMachine(pos: TilePos, type: MachineType) {
		if (!Game.isFree(pos)) {
			return;
		}
		Game.machines.add(new Machine(pos, MachineType.ConstructionSite, {
			cost: new Cost(MACHINE_DATA[type].cost),
			result: type,
		}));
	}

	static debugMode() {
		for (const r of RESEARCH) {
			for (let i = 0; i < 20; i++) {
				if (r.availlable()) {
					r.onResearched();
					if (r.costIncrease) {
						r.cost = r.costIncrease(r.cost);
					}
				}
			}
		}
	}
}

const RESEARCH: {
	name: string,
	cost: Cost,
	time: number,
	onResearched: () => void,
	availlable: () => boolean,
	costIncrease?: (current: Cost) => Cost,
}[] = [
		{
			name: "+Drill Level",
			cost: new Cost({ ore: 100, crystal: 20 }),
			time: 100,
			onResearched: () => {
				Game.drillLevel++;
			},
			availlable: () => Game.drillLevel < 2,
			costIncrease: (current: Cost) => {
				for (const [type, count] of current.amount) {
					current.amount.set(type, count * 2);
				}
				return current;
			},
		},
		{
			name: "+Drill Speed",
			cost: new Cost({ ore: 20 }),
			time: 20,
			onResearched: () => {
				Game.drillSpeed++;
			},
			availlable: () => true,
			costIncrease: (current: Cost) => {
				return new Cost({ ore: current.amount.get(ItemType.Ore) + 20 });
			},
		},
		{
			name: "+Worker Capacity",
			cost: new Cost({ crystal: 10 }),
			time: 50,
			onResearched: () => {
				Game.workers.capacity += 10;
			},
			availlable: () => true,
			costIncrease: (current: Cost) => {
				return new Cost({ crystal: current.amount.get(ItemType.Crystal) * 2 });
			},
		},
		{
			name: "+Game Speed",
			cost: new Cost({ ore: 100, crystal: 20 }),
			time: 100,
			onResearched: () => {
				Game.gameSpeed -= 20;
			},
			availlable: () => Game.gameSpeed > 40,
			costIncrease: (current: Cost) => {
				for (const [type, count] of current.amount) {
					current.amount.set(type, count * 2);
				}
				return current;
			},
		},
	];