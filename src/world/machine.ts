
import { Cost } from "../cost";
import { Game } from "../game";
import { Dir, TilePos } from "../geometry/pos";
import { Rect } from "../geometry/rect";
import { Option, Selectable } from "../menu";
import { Scheduler } from "../scheduler";
import { ItemType } from "./item";
import { Tile, Material } from "./tile";
import { Symbol, World } from "./world";

export enum MachineType {
	Spawn,
	Lab,
	ConstructionSite,
	Platform,
}

export const BUILD_COSTS: {
	cost?: Cost,
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
			buildable: false,
		},
		{ // Platform
			cost: new Cost({ ore: 2 }),
			buildable: true,
		}
	];

export interface MachineOptions {
	cost?: Cost,
	result?: MachineType,
	workDone?: () => void,
}

export class Machine implements Selectable {
	parent: Scheduler;
	pos: TilePos;
	rect: Rect;
	type: MachineType;
	cooldown: number = 0;
	power: boolean = false;
	level: number = 0;
	options: MachineOptions;
	levelupCost: Cost = new Cost({ ore: 5 });

	constructor(parent: Scheduler, pos: TilePos, type: MachineType, options: MachineOptions = {}) {
		this.parent = parent;
		this.pos = new TilePos(pos);
		this.type = type;
		this.options = options;
		this.rect = new Rect(
			this.pos.x * World.tileSize,
			this.pos.y * World.tileSize,
			World.tileSize,
			World.tileSize
		);

		if (type == MachineType.ConstructionSite) {
			if (options.cost) {
				this.parent.request(options.cost);
			}
		}

		if (type == MachineType.Spawn) {
			if (parent.countResource(ItemType.Crystal) > 0) {
				this.setPower(true);
			}
		} else {
			if (this.neighborMachines().find(m => m.power)) {
				this.setPower(true);
			}
		}

		if (type == MachineType.Platform) {
			Game.place(pos, Material.Platform);
		} else {
			Game.place(pos, Material.Machine);
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

	freeNeighbor(): TilePos | null {
		for (let i = 0; i < 4; i++) {
			const pos = new TilePos(this.pos);
			pos.move(i);
			if (!Tile.at(pos).isSolid()) {
				return pos;
			}
		}
		return null;
	}

	private neighborMachines(): Machine[] {
		return [Dir.UP, Dir.RIGHT, Dir.DOWN, Dir.LEFT]
			.map(dir => new TilePos(this.pos).move(dir))
			.map(pos => this.parent.machines.at(pos))
			.filter(m => m);
	}

	requestedItemDelivered(type: ItemType) {
		if (this.type == MachineType.Spawn) {
			this.parent.resources.add(type);
		}
	}
	requestComplete() {
		if (this.type == MachineType.ConstructionSite) {
			delete this.options.cost;
			this.cooldown = 5;
			this.options.workDone = () => {
				const result = this.options.result || MachineType.Spawn;
				delete this.options.result;
				if (result == MachineType.Platform) {
					Game.place(this.pos, Material.Platform);
				}
				this.type = result;
				if (this.conducts() && this.givesPower()) {
					this.setPower(true);
				}
			}
		}
	}

	givesPower(): boolean {
		if (this.type == MachineType.Spawn && this.parent.countResource(ItemType.Crystal) > 0) {
			return true;
		}
		return false;
	}

	conducts(): boolean {
		return this.type != MachineType.ConstructionSite;
	}

	setPower(power: boolean) {
		if (!this.conducts() || this.power == power) {
			return;
		}
		if (this.givesPower() && !power) {
			return;
		}
		let neighbors = this.neighborMachines().filter(m => m.conducts());

		if (!power && neighbors.find(m => m.givesPower())) {
			this.power = true;
			neighbors.forEach(m => {
				if (!m.power) {
					m.setPower(true);
				}
			});
			return;
		}

		this.power = power;
		for (const machine of neighbors) {
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

	draw(context: CanvasRenderingContext2D) {
		World.drawMachine(context, this.type, this.rect);
		if (!this.power && this.conducts()) {
			context.fillStyle = "rgba(0,0,0,0.3)";
			context.fillRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
			World.drawSymbol(context, Symbol.LowPower, this.rect);
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
				callback: () => {
					this.parent.removeMachine(this);
					Game.place(this.pos, Material.Debris);
					return true;
				},
			}
		];

		if (this.type != MachineType.ConstructionSite) {
			options.unshift({
				name: "Level up " + this.levelupCost.display(),
				callback: () => {
					this.parent.pay(this.levelupCost);
					this.options.workDone = () => this.level++;
					this.cooldown = (this.level + 2) * 4;
					this.levelupCost.amount.set(ItemType.Ore, (this.level + 2) * 5);
					return false;
				},
				enabled: () => this.ready() && this.parent.isAvailable(this.levelupCost)
			});
		}

		if (this.type == MachineType.Spawn) {
			options.unshift({
				name: "Spawn Worker",
				callback: () => {
					this.options.workDone = () => {
						const pos = this.freeNeighbor();
						if (pos) {
							throw new Error("Not implemented!");
						} else {
							alert("Unable to spawn Worker: No free space near Spawn!");
						}
					}
					this.cooldown = Math.max(5, 20 - this.level * 2);
					return false;
				},
				enabled: () => this.ready() && Game.scheduler.workers.hasRoom() && this.freeNeighbor() != null
			});
		} else if (this.type == MachineType.Lab) {
			RESEARCH
				.filter(r => r.available())
				.map(r => ({
					name: r.name + "\n" + r.cost.display(),
					callback: () => {
						this.parent.pay(r.cost);
						this.cooldown = Math.max(5, r.time - this.level * 5);
						this.options.workDone = r.onResearched;
						if (r.costIncrease) {
							r.cost = r.costIncrease(r.cost);
						}
						return false;
					},
					enabled: () => this.ready() && this.parent.isAvailable(r.cost) && r.available(),
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
		Game.scheduler.addMachine(pos, MachineType.ConstructionSite, {
			cost: new Cost(BUILD_COSTS[type].cost || {}),
			result: type,
		});
	}

	static debugMode() {
		for (const r of RESEARCH) {
			for (let i = 0; i < 20; i++) {
				if (r.available()) {
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
	available: () => boolean,
	costIncrease?: (current: Cost) => Cost,
}[] = [
		{
			name: "+Drill Level",
			cost: new Cost({ ore: 100, crystal: 20 }),
			time: 100,
			onResearched: () => {
				Game.drillLevel++;
			},
			available: () => Game.drillLevel < 2,
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
			available: () => true,
			costIncrease: (current: Cost) => {
				return new Cost({ ore: current.amount.get(ItemType.Ore)! + 20 });
			},
		},
		{
			name: "+Worker Capacity",
			cost: new Cost({ crystal: 10 }),
			time: 50,
			onResearched: () => {
				Game.scheduler.workers.capacity += 10;
			},
			available: () => true,
			costIncrease: (current: Cost) => {
				return new Cost({ crystal: current.amount.get(ItemType.Crystal)! * 2 });
			},
		},
		{
			name: "+Game Speed",
			cost: new Cost({ ore: 100, crystal: 20 }),
			time: 100,
			onResearched: () => {
				Game.gameSpeed -= 20;
			},
			available: () => Game.gameSpeed > 40,
			costIncrease: (current: Cost) => {
				for (const [type, count] of current.amount) {
					current.amount.set(type, count * 2);
				}
				return current;
			},
		},
	];