
import { Path } from "../geometry/path";
import { Dir, TilePos } from "../geometry/pos";
import { Rect } from "../geometry/rect";
import { Wasm } from "../wasm";
import { MachineType } from "./machine";
import { TileType } from "./tile";

export enum Symbol {
	LowPower = 0,
}

export class World {
	private static wasm: Wasm;
	private static assets: ImageBitmap;
	static canvas: HTMLCanvasElement;
	static width = 128;
	static height = 128;
	static tileSize = 16;

	static needsDrawing = true;

	static debugParams = {
		hpaLevel: -1,
		edges: false,
		ignoreVisibility: false,
	};

	static init(wasm: Wasm, assets: ImageBitmap) {
		World.wasm = wasm;
		World.assets = assets;

		World.wasm.init(World.width, World.height);

		World.canvas = document.createElement("canvas");

		World.canvas.width = World.width * World.tileSize;
		World.canvas.height = World.height * World.tileSize;

	}

	static place(pos: TilePos, material: TileType) {
		World.wasm.set(pos.x, pos.y, material);
		World.wasm.set_visible(pos.x, pos.y);
		World.needsDrawing = true;
	}

	static draw(target: CanvasRenderingContext2D, debugDisplayActive: boolean) {
		if (!World.needsDrawing) {
			target.drawImage(World.canvas, 0, 0);
			return;
		}
		World.needsDrawing = false;

		const ignoreVis = debugDisplayActive && World.debugParams.ignoreVisibility;

		const context = World.canvas.getContext("2d");
		if (!context) {
			throw new Error("Canvas 2d-Mode not supported");
		}
		context.fillStyle = "black";
		context.fillRect(0, 0, World.canvas.width, World.canvas.height);
		context.fillStyle = "white";
		const pos = new TilePos(0, 0);
		for (pos.y = 0; pos.y < World.height; pos.y++) {
			for (pos.x = 0; pos.x < World.width; pos.x++) {
				if (ignoreVis || World.wasm.is_visible(pos.x, pos.y)) {
					context.fillRect(pos.x * World.tileSize, pos.y * World.tileSize, World.tileSize, World.tileSize);
					const n = World.wasm.get(pos.x, pos.y) as number;
					if (World.wasm.get(pos.x, pos.y) == TileType.Platform) {
						const variant = [0, 1, 2, 3].map(dir => {
							const other = pos.getInDir(dir as Dir);
							if (!other.isValid()) {
								return false;
							}
							const type = World.wasm.get(other.x, other.y);
							return type == TileType.Platform || type == TileType.Machine;
						})
							.map(hasNeighbor => hasNeighbor ? 1 : 0)
							.reduceRight((prev, curr) => (prev << 1) | curr, 0);
						context.drawImage(World.assets, variant * 16, 32, 16, 16, pos.x * World.tileSize, pos.y * World.tileSize, World.tileSize, World.tileSize);
					} else {
						context.drawImage(World.assets, n * 16, 0, 16, 16, pos.x * World.tileSize, pos.y * World.tileSize, World.tileSize, World.tileSize);
					}
				}
			}
		}
		if (!debugDisplayActive || World.debugParams.hpaLevel == -1) {
			target.drawImage(World.canvas, 0, 0);
			return;
		}
		context.strokeStyle = "red";
		context.beginPath();
		const chunkSize = World.wasm.chunk_size();
		for (let y = 0; y < World.height; y += chunkSize) {
			context.moveTo(0, y * World.tileSize);
			context.lineTo(World.canvas.width, y * World.tileSize);
		}
		for (let x = 0; x < World.width; x += chunkSize) {
			context.moveTo(x * World.tileSize, 0);
			context.lineTo(x * World.tileSize, World.canvas.height);
		}
		context.stroke();
		const colors = ["black"];
		for (let i = 1; i < chunkSize * 4; i++) {
			let percent = i / (chunkSize * 4);
			colors.push("rgb(" + (percent * 255) + ", " + (255 - percent * 255) + ", 0)")
		}
		World.wasm.iter_links();
		let linkCount = 0, connectionCount = 0;

		while (World.wasm.next_link()) {
			linkCount++;

			const x = World.wasm.link_x();
			const y = World.wasm.link_y();
			const id = World.wasm.link_id();

			context.strokeStyle = "red";
			context.strokeRect(x * World.tileSize + 1, y * World.tileSize + 1, World.tileSize - 2, World.tileSize - 2);

			if (World.debugParams.edges) {
				while (World.wasm.next_connection()) {
					connectionCount++;

					const cx = World.wasm.connection_x();
					const cy = World.wasm.connection_y();
					const cost = World.wasm.connection_cost();
					context.strokeStyle = colors[cost];
					context.beginPath();
					context.moveTo((x + 0.5) * World.tileSize, (y + 0.5) * World.tileSize);
					const midX = ((x + 0.5) + (cx + 0.5)) / 2;
					const midY = ((y + 0.5) + (cy + 0.5)) / 2;
					context.lineTo(midX * World.tileSize, midY * World.tileSize);
					context.stroke();
				}
			}

			//context.strokeStyle = "blue";
			//context.strokeText(id.toString(), x * World.tileSize, (y + 1) * World.tileSize);
		}
		console.log("Links: ", linkCount);
		console.log("Connections: ", connectionCount);
		target.drawImage(World.canvas, 0, 0);
	}

	static drawMachine(context: CanvasRenderingContext2D, type: MachineType, rect: Rect) {
		context.drawImage(World.assets, type * 16, 16, 16, 16, rect.x, rect.y, rect.width, rect.height);
	}
	static drawSymbol(context: CanvasRenderingContext2D, symbol: Symbol, rect: Rect) {
		context.drawImage(World.assets, symbol * 16, 48, 16, 16, rect.x, rect.y, rect.width, rect.height);
	}

	/**
	 * tries to generate a path from start to end
	 * @param start the start Point
	 * @param end the end Point
	 */
	static genPath(start: TilePos, end: TilePos): Path | null {
		if (start.x == end.x && start.y == end.y) {
			return new Path(start, end, 0, Dir.NONE);
		}
		if (!start.isValid() || !end.isValid()) {
			return null;
		}
		let length = World.wasm.find_path(start.x, start.y, end.x, end.y);
		if (length < 0) {
			return null;
		}
		const nextDir = length & 0b11;
		length = length >> 2;
		return new Path(start, end, length, nextDir);
	}

	static genPaths(starts: TilePos[], ends: TilePos[]): Map<TilePos, Map<TilePos, Path>> {
		if (starts.length == 0 || ends.length == 0) {
			return new Map();
		}
		const new_ends = ends.map(end => end.isValid() ? end : null);
		const new_starts = starts.map(start => start.isValid() ? start : null);
		for (const end of new_ends) {
			if (end) {
				World.wasm.add_flood_goal(end.x, end.y);
			}
		}
		const paths = new Map();
		for (const start of new_starts) {
			if (!start) {
				continue;
			}
			const current_paths = new Map<TilePos, Path>();

			World.wasm.flood_search(start.x, start.y);
			for (const end of new_ends) {
				if (!end) {
					continue;
				}
				const result = World.wasm.flood_path_to(end.x, end.y);
				if (result == -1) {
					continue;
				}
				const nextDir = result & 0b11;
				const length = result >> 2;
				current_paths.set(end, new Path(start, end, length, nextDir));
			}

			paths.set(start, current_paths);
		}
		World.wasm.end_flood_search();
		return paths;
	}

	static revealWorld() {
		for (let x = 1; x < 127; x++)
			for (let y = 1; y < 127; y++)
				World.wasm.set_visible(x, y);
		World.needsDrawing = true;
	}
}
