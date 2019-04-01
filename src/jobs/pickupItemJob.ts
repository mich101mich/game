
import { Item } from "../item";
import { Machine } from "../machine";
import { Job } from "./job";

export class PickupItemJob extends Job {
	constructor(item: Item) {
		super(
			item.pos.toTilePos(),
			{
				duration: 0,
				priority: item.request ? item.request.priority : 0
			},
			(worker) => {
				worker.pickUp(item);
				worker.setJob(null);
			},
			(worker) => item.worker == null
				&& item.exists()
				&& (!worker || worker.item == null)
		);
	}
}
