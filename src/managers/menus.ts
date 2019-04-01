
import { Game } from "../game";
import { Menu, Selectable } from "../menu";

export class Menus {
	side: Menu;
	context: Menu;
	info: HTMLDivElement;

	onNewSelection(selection: Set<Selectable>) {
		this.side.selection.clear();
		selection.forEach(s => this.side.selection.add(s));
		this.context.selection.clear();
		this.refresh();
	}
	refresh() {
		this.side.refresh();
		this.context.refresh();
	}
	remove(target: Selectable) {
		this.side.selection.delete(target);
		this.context.selection.delete(target);
		this.refresh();
	}
}

