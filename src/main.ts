
import { Game } from "./game";

//@ts-ignore
window["Game"] = Game;

//@ts-ignore
let decoder = new TextDecoder("utf-8");

const importObject = {
	env: {
		random: Math.random,
		log_str: function (ptr: number, len: number) {
			const slice = Game.wasm.memory.buffer.slice(ptr, ptr + len);
			console.log(decoder.decode(slice));
		},
		err_str: function (ptr: number, len: number) {
			const slice = Game.wasm.memory.buffer.slice(ptr, ptr + len);
			console.error(decoder.decode(slice));
		},
	}
};

const wasm = fetch("lib.wasm")
	.then(file => file.arrayBuffer())
	// @ts-ignore
	.then(buffer => WebAssembly.instantiate(buffer, importObject))
	.then(result => result.instance.exports);

const assets = new Promise(
	(resolve, reject) => window.addEventListener("load", resolve))
	.then(() => createImageBitmap(document.getElementById("assets") as HTMLImageElement));

Promise.all([assets, wasm]).then(([assets, wasm]) => {
	Game.init(wasm, assets);
})


// declares

declare global {
	interface Array<T> {
		min(indicator?: (t: T) => number): T;
		remove(element: T): boolean;
		removeAt(index: number): T;
		removeWhere(predicate: ((t: T) => boolean)): T[];
	}
	interface Set<T> {
		first(): T;
	}
}

Array.prototype.min = function <T>(this: Array<T>, indicator?: (t: T) => number): T | null {
	if (this.length == 0) {
		return null;
	}
	let minI = 0, min = (indicator ? indicator(this[0]) : this[0]);
	for (let i = 1; i < this.length; i++) {
		const value = (indicator ? indicator(this[i]) : this[i]);
		if (value < min) {
			minI = i;
			min = value;
		}
	}
	return this[minI];
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