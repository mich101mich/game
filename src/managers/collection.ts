
export class Collection<T> implements Iterable<T> {

	private list = new Set<T>();
	capacity: number;

	constructor(capacity?: number) {
		this.capacity = capacity || Infinity;
	}

	[Symbol.iterator](): Iterator<T> {
		return this.list[Symbol.iterator]();
	}

	get count() {
		return this.list.size;
	}
	hasRoom() {
		return this.count < this.capacity;
	}
	contains(element: T) {
		return this.list.has(element);
	}

	add(element: T): boolean {
		if (!this.hasRoom()) {
			return false;
		}
		const length = this.count;
		return this.list.add(element).size > length;
	}

	remove(element: T): boolean {
		return this.list.delete(element);
	}

}
