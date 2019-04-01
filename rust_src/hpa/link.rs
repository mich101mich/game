use super::{get_chunk_pos, get_chunk_size, LAYER_COUNT};
use rust_src::{Cost, Path, Point};
use std::collections::{HashMap, HashSet};

pub type LinkId = usize;

#[derive(Debug)]
pub struct Link {
	pub id: LinkId,
	pub pos: Point,
	pub walk_cost: Option<Cost>,
	pub paths: HashMap<LinkId, Path<Point>>,
	pub connections: HashMap<LinkId, Path<LinkId>>,
	pub edges: [HashSet<LinkId>; LAYER_COUNT],
}

impl Link {
	pub fn new(id: LinkId, pos: Point, walk_cost: Option<Cost>) -> Link {
		Link {
			id,
			pos,
			walk_cost,
			paths: HashMap::new(),
			connections: HashMap::new(),
			edges: [HashSet::new(), HashSet::new()],
		}
	}
	pub fn path_to(&self, id: LinkId) -> Option<&Path<Point>> {
		self.paths.get(&id)
	}
	pub fn is_solid(&self) -> bool {
		self.walk_cost.is_none()
	}
	pub fn is_edge(&self, layer: usize) -> bool {
		let chunk_size = get_chunk_size(layer);
		let rel = self.pos - get_chunk_pos(self.pos, layer);
		let x_edge = rel.x == 0 || rel.x == chunk_size - 1;
		let y_edge = rel.y == 0 || rel.y == chunk_size - 1;
		x_edge || y_edge
	}
}
