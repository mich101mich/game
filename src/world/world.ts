
import { Path } from "../geometry/path";
import { Dir, TilePos } from "../geometry/pos";
import { Rect } from "../geometry/rect";
import { MachineType } from "./machine";
import { Material } from "./tile";
import { Wasm, RustPoint, RustPath } from "../main";

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

	static init(wasm: any, assets: ImageBitmap) {
		World.wasm = wasm;
		World.assets = assets;

		World.wasm.init(World.width, World.height);

		World.canvas = document.createElement("canvas");

		World.canvas.width = World.width * World.tileSize;
		World.canvas.height = World.height * World.tileSize;

	}

	static place(pos: TilePos, material: Material) {
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
					if (World.wasm.get(pos.x, pos.y) == Material.Platform) {
						const variant = [0, 1, 2, 3].map(dir => {
							const other = pos.getInDir(dir as Dir);
							if (!other.isValid()) {
								return false;
							}
							const type = World.wasm.get(other.x, other.y);
							return type == Material.Platform || type == Material.Machine;
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

		const positions = World.wasm.node_positions() as RustPoint[];
		let connectionCount = 0;

		for (let i = 0; i < positions.length; i++) {

			const pos = positions[i];

			context.strokeStyle = "red";
			context.strokeRect(pos.x * World.tileSize + 1, pos.y * World.tileSize + 1, World.tileSize - 2, World.tileSize - 2);

			if (World.debugParams.edges) {
				const neighbors = World.wasm.node_neighbors(i) as RustPoint[];
				connectionCount += neighbors.length;

				for (let n = 0; n < neighbors.length; n++) {
					const neighbor = neighbors[n]

					context.strokeStyle = "green";
					context.beginPath();
					context.moveTo((pos.x + 0.5) * World.tileSize, (pos.y + 0.5) * World.tileSize);
					const midX = ((pos.x + 0.5) + (neighbor.x + 0.5)) / 2;
					const midY = ((pos.y + 0.5) + (neighbor.y + 0.5)) / 2;
					context.lineTo(midX * World.tileSize, midY * World.tileSize);
					context.stroke();
				}
			}
		}
		console.log("Links: ", positions.length);
		if (World.debugParams.edges) {
			console.log("Connections: ", connectionCount);
		}
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
		if (!start.isValid() || !end.isValid()) {
			return null;
		}
		const path = World.wasm.find_path(start.x, start.y, end.x, end.y) as RustPath | null;
		if (path) {
			return new Path(path);
		} else {
			return null;
		}
	}

	static genPaths(start: TilePos, ends: TilePos[]): Map<TilePos, Path> {
		if (ends.length == 0) {
			return new Map();
		}
		const paths = World.wasm.find_paths(start.x, start.y, ends) as { [name: string]: RustPath };
		const ret = new Map<TilePos, Path>();

		for (const end of ends) {
			const name = end.x + ":" + end.y;
			if (name in paths) {
				ret.set(end, new Path(paths[name]));
			}
		}

		return ret;
	}

	static revealWorld() {
		for (let x = 1; x < 127; x++)
			for (let y = 1; y < 127; y++)
				World.wasm.set_visible(x, y);
		World.needsDrawing = true;
	}
}
