
import { Rect } from "./geometry/rect";
import { MouseHandler, MouseMode } from "./mouseHandler";

export type Option = {
	name: string,
	callback: () => boolean,
	enabled?: () => boolean,
};

export interface Selectable {
	getOptionMenu(selection: Set<Selectable>): Option[];
	getDescription(): string;
	getInfo(): string;
	getOutline(): Rect;
}

export class Menu {
	mouseHandler: MouseHandler;
	container: HTMLTableElement;
	selection = new Set<Selectable>();
	options: Option[] = [];
	buttons: HTMLButtonElement[] = [];
	hasDefaultOptions: boolean;

	constructor(mouseHandler: MouseHandler, container: HTMLTableElement, hasDefaultOptions: boolean = true) {
		this.mouseHandler = mouseHandler;
		this.container = container;
		this.hasDefaultOptions = hasDefaultOptions;

		document.addEventListener("keydown", event => {

			this.mouseHandler.updateKeys(event);

			const key = toKeyCode(event);

			if (key == " " && this.options.length > 0) {
				this.call(this.options[0]);
				event.preventDefault();
			} else if (key.match(/^[1-9]$/)) {
				const num = parseInt(key) - 1;
				if (num < this.options.length) {
					this.call(this.options[num]);
					event.preventDefault();
				}
			}
		});

		this.refresh();
	}

	call(option: Option) {
		if (!option || (option.enabled && !option.enabled())) {
			return;
		}
		if (option.callback()) {
			this.selection.clear();
		}
		this.refresh();
	}

	refresh() {
		if (this.selection.size == 0) {
			if (this.hasDefaultOptions) {
				this.options = this.getDefaultOptions();
			} else {
				this.options = [];
			}
		} else {
			this.options = this.selection.first().getOptionMenu(this.selection);
		}

		while (this.buttons.length < this.options.length) {
			const tr = document.createElement("tr");
			this.container.appendChild(tr);
			const td = document.createElement("td");
			tr.appendChild(td);
			const button = document.createElement("button");
			const index = this.buttons.length;
			button.addEventListener("click", () => {
				this.call(this.options[index]);
			});
			td.appendChild(button);
			this.buttons.push(button);
		}

		while (this.buttons.length > this.options.length) {
			this.buttons.pop();
			const item = this.container.children.item(this.container.childElementCount - 1);
			if (item) {
				this.container.removeChild(item);
			}
		}

		const elements = this.container.getElementsByTagName("button");
		for (let i = 0; i < this.options.length; i++) {
			const option = this.options[i];

			let button = elements[i] as HTMLButtonElement;
			button.innerText = option.name;
		}
	}

	draw(context: CanvasRenderingContext2D) {
		context.strokeStyle = "red";
		this.selection.forEach(sel => {
			const rect = sel.getOutline();
			context.strokeRect(rect.x, rect.y, rect.width, rect.height);
		});

		this.options.forEach((option, i) => {
			const enabled = !option.enabled || option.enabled();
			if (enabled) {
				this.buttons[i].removeAttribute("disabled");
			} else {
				this.buttons[i].setAttribute("disabled", "");
			}
		});
	}

	getInfo(): string {
		if (this.selection.size == 0) {
			return "";
		}
		const first = this.selection.first();
		if (this.selection.size == 1) {
			return first.getDescription() + "\n" + first.getInfo();
		} else {
			let count: { [index: string]: number } = {};
			let info = first.getInfo();
			for (const sel of this.selection) {
				const des = sel.getDescription();
				count[des] = (count[des] || 0) + 1;
				let i = sel.getInfo();
				if (info != i) {
					info = "";
				}
			}

			let description = "";
			for (const desc in count) {
				description += count[desc] + "x " + desc + "\n";
			}
			return description + info;
		}
	}
	getDefaultOptions(): Option[] {
		let options: Option[] = [];

		if (this.mouseHandler.mouseMode != MouseMode.PlacePlatform) {
			options.push({
				name: "Place Platforms",
				callback: () => {
					this.mouseHandler.mouseMode = MouseMode.PlacePlatform;
					return true;
				}
			});
		} else {
			options.push({
				name: "Stop placing Platforms",
				callback: () => {
					this.mouseHandler.mouseMode = MouseMode.Default;
					return true;
				}
			});
		}

		return options;
	}
}

function toKeyCode(event: KeyboardEvent): string {
	let key = event.key.toLowerCase();
	if (event.altKey) {
		key = "alt+" + key;
	}
	if (event.metaKey) {
		key = "meta+" + key;
	}
	if (event.shiftKey) {
		key = "shift+" + key;
	}
	if (event.ctrlKey) {
		key = "ctrl+" + key;
	}
	return key;
}

