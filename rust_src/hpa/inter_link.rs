use super::CHUNK_SIZE;
use rust_src::{Cost, Path, Point};
use std::collections::HashMap;

pub type LinkId = usize;

#[derive(Debug)]
pub struct InterLink {
	pub id: LinkId,
	pub pos: Point,
	pub chunk: Point,
	pub walk_cost: Cost,
	pub is_temp: bool,
	pub sides: [bool; 4],
	pub neighbors: [Option<LinkId>; 4],
	pub edges: HashMap<LinkId, Path<Point>>,
	pub temp_edges: HashMap<LinkId, Path<Point>>,
}

impl InterLink {
	pub fn new(
		id: LinkId,
		pos: Point,
		walk_cost: Cost,
		sides: [bool; 4],
		neighbors: [Option<LinkId>; 4],
	) -> InterLink {
		InterLink {
			id,
			pos,
			chunk: (pos / CHUNK_SIZE) * CHUNK_SIZE,
			walk_cost,
			is_temp: false,
			sides,
			neighbors,
			edges: HashMap::new(),
			temp_edges: HashMap::new(),
		}
	}
	pub fn temp(
		id: LinkId,
		pos: Point,
		walk_cost: Cost,
		sides: [bool; 4],
		neighbors: [Option<LinkId>; 4],
	) -> InterLink {
		InterLink {
			is_temp: true,
			..InterLink::new(id, pos, walk_cost, sides, neighbors)
		}
	}
	pub fn add_neighbor(&mut self, dir: usize, neighbor: LinkId) {
		self.sides[dir] = true;
		self.neighbors[dir] = Some(neighbor);
		self.edges.insert(
			neighbor,
			Path::new(
				vec![self.pos, self.pos.get_in_dir(dir.into()).unwrap()],
				self.walk_cost,
			),
		);
	}
	pub fn remove_neighbor(&mut self, dir: usize) {
		self.sides[dir] = false;
		if let Some(neighbor) = self.neighbors[dir] {
			self.edges.remove(&neighbor);
			self.temp_edges.remove(&neighbor);
		}
		self.neighbors[dir] = None;
	}
	pub fn clear_temp(&mut self) {
		self.temp_edges.clear();
	}
	pub fn edges(&self) -> Edges {
		Edges::new(&self)
	}
	pub fn path_to(&self, id: LinkId) -> Option<&Path<Point>> {
		self.edges.get(&id).or_else(|| self.temp_edges.get(&id))
	}
}

use std::collections::hash_map::Keys;

pub struct Edges<'a> {
	edge_iter: Keys<'a, LinkId, Path<Point>>,
	temp_edge_iter: Keys<'a, LinkId, Path<Point>>,
}
impl<'a> Edges<'a> {
	pub fn new(src: &InterLink) -> Edges {
		Edges {
			edge_iter: src.edges.keys(),
			temp_edge_iter: src.temp_edges.keys(),
		}
	}
}
impl<'a> Iterator for Edges<'a> {
	type Item = LinkId;
	fn next(&mut self) -> Option<LinkId> {
		self.edge_iter
			.next()
			.or_else(|| self.temp_edge_iter.next())
			.map(|&id| id)
	}
}
