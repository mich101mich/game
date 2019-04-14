
import { Game } from "./game";
import { World } from "./world/world";

//@ts-ignore
window["Game"] = Game;
//@ts-ignore
window["World"] = World;

export type Wasm = typeof import("./bindgen/wasm");
export type RustPoint = {
	x: number,
	y: number,
}
export type RustPath = {
	path: RustPoint[],
	cost: number,
}

const assets = new Promise(
	(resolve, reject) => window.addEventListener("load", resolve))
	.then(() => createImageBitmap(document.getElementById("assets") as HTMLImageElement));

const getWasm = import("./bindgen/wasm");

Promise.all([assets, getWasm]).then(([assets, wasm]) => {
	Game.init(wasm, assets);
})


// declares

declare global {
	interface Array<T> {
		min(indicator?: (element: T, index: number, array: T[]) => number): T;
		max(indicator?: (element: T, index: number, array: T[]) => number): T;
		remove(element: T): boolean;
		removeAt(index: number): T;
		removeWhere(predicate: ((t: T) => boolean)): T[];
	}
	interface Set<T> {
		first(): T;
	}
}

Array.prototype.min = function <T>(this: Array<T>, indicator?: (element: T, index: number, array: T[]) => number): T | null {
	if (this.length == 0) {
		return null;
	}
	let minI = 0, min = (indicator ? indicator(this[0], 0, this) : this[0]);
	for (let i = 1; i < this.length; i++) {
		const value = (indicator ? indicator(this[i], i, this) : this[i]);
		if (value < min) {
			minI = i;
			min = value;
		}
	}
	return this[minI];
}
Array.prototype.max = function <T>(this: Array<T>, indicator?: (element: T, index: number, array: T[]) => number): T | null {
	if (this.length == 0) {
		return null;
	}
	let maxI = 0, max = (indicator ? indicator(this[0], 0, this) : this[0]);
	for (let i = 1; i < this.length; i++) {
		const value = (indicator ? indicator(this[i], i, this) : this[i]);
		if (value > max) {
			maxI = i;
			max = value;
		}
	}
	return this[maxI];
}

Array.prototype.remove = function <T>(this: Array<T>, element: T): boolean {
	let index = this.indexOf(element);
	if (index != -1) {
		this.splice(index, 1);
	}
	return index != -1;
}

Array.prototype.removeAt = function <T>(this: Array<T>, index: number): T | null {
	const result = this.splice(index, 1);
	return result ? result[0] : null;
}

Array.prototype.removeWhere = function <T>(this: Array<T>, predicate: (t: T) => boolean): T[] {
	const ret = [];
	for (let i = 0; i < this.length; i++) {
		if (predicate(this[i])) {
			ret.push(this.removeAt(i--));
		}
	}
	return ret;
}

Set.prototype.first = function <T>(this: Set<T>) {
	return this.values().next().value;
}