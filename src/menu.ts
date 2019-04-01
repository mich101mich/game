
import { Game } from "./game";
import { Rect } from "./geometry/mod";
import { MouseMode } from "./mouseHandler";

export type Option = {
	name: string,
	callback: () => boolean,
	enabled?: () => boolean,
	hotkeys: string[],
};

export interface Selectable {
	getOptionMenu(selection: Set<Selectable>): Option[];
	getDescription(): string;
	getInfo(): string;
	getOutline(): Rect;
}

export class Menu {
	container: HTMLTableElement;
	selection = new Set<Selectable>();
	options: Option[] = [];
	buttons: HTMLButtonElement[] = [];
	hasDefaultOptions: boolean;

	constructor(container: HTMLTableElement, hasDefaultOptions: boolean = true) {
		this.container = container;
		this.hasDefaultOptions = hasDefaultOptions;

		document.addEventListener("keydown", event => {

			Game.mouseHandler.updateKeys(event);

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
			} else {
				for (const option of this.options) {
					if (option.hotkeys.indexOf(key) != -1) {
						this.call(option);
						event.preventDefault();
					}
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
				this.options = getDefaultOptions();
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
			this.container.removeChild(this.container.children.item(this.container.childElementCount - 1));
		}

		const elements = this.container.getElementsByTagName("button");
		for (let i = 0; i < this.options.length; i++) {
			const option = this.options[i];

			let button = elements[i] as HTMLButtonElement;

			button.setAttribute("tooltip", [(i + 1).toString()].concat(option.hotkeys).join(", "));
			button.setAttribute("tooltip-position", "left");
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
					info = null;
				}
			}

			let description = "";
			for (const desc in count) {
				description += count[desc] + "x " + desc + "\n";
			}
			return description + (info || "");
		}
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

function getDefaultOptions(): Option[] {
	let options: Option[] = [];

	if (Game.mouseHandler.mouseMode != MouseMode.PlacePlatform) {
		options.push({
			name: "Place Platforms",
			callback: () => {
				Game.mouseHandler.mouseMode = MouseMode.PlacePlatform;
				return true;
			},
			hotkeys: ["p"]
		});
	} else {
		options.push({
			name: "Stop placing Platforms",
			callback: () => {
				Game.mouseHandler.mouseMode = MouseMode.Default;
				return true;
			},
			hotkeys: ["p"]
		});
	}

	return options;
}
