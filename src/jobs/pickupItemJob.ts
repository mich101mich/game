
import { Item } from "../item";
import { Machine } from "../machine";
import { Job } from "./job";

export class PickupItemJob extends Job {
	constructor(item: Item) {
		super(
			item.pos.toTilePos(),
			{
				duration: 0,
				priority: item.request.priority
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
