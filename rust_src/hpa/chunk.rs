use super::{Link, LinkId};
use rust_src::{ordered_insert, Path};
use std::collections::HashMap;

pub trait Chunk {
	fn pos(&self) -> Point;
	fn layer(&self) -> usize;
	fn chunk_size(&self) -> usize {
		get_chunk_size(self.layer())
	}
	fn side(&self, side: ::rust_src::Dir) -> &[Option<LinkId>];

	fn all_reachable(
		&self,
		start: LinkId,
		all_links: &HashMap<LinkId, Link>,
	) -> HashMap<LinkId, Path<LinkId>> {
		let mut ret = HashMap::new();
		let mut to_visit = vec![(start, Path::new(vec![start], 0))];

		while let Some((link, path)) = to_visit.pop() {
			for (neighbor, to_neighbor) in all_links[&link].connections.iter() {
				if ret.contains_key(neighbor)
					|| get_chunk_pos(all_links[neighbor].pos, self.layer()) != self.pos()
				{
					continue;
				}
				let mut new_path = path.clone();
				new_path.append(*neighbor, to_neighbor.cost);

				ret.insert(*neighbor, new_path.clone());

				ordered_insert(&mut to_visit, (*neighbor, new_path), |(_, path)| path.cost)
			}
		}

		ret
	}
}

use rust_src::Point;

pub fn get_chunk_size(layer: usize) -> usize {
	super::CHUNK_SIZE * 2usize.pow(layer as u32)
}

pub fn get_chunk_pos(point: Point, layer: usize) -> Point {
	let chunk_size = get_chunk_size(layer);
	(point / chunk_size) * chunk_size
}
