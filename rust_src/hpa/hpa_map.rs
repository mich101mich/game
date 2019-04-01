use super::*;
use rust_src::{a_star_search, dijkstra_search, Cost, Dir, Materials, Path, Point};
use std::collections::HashMap;

pub const LAYER_COUNT: usize = 2;

#[derive(Debug)]
pub struct HPAMap {
	pub width: usize,
	pub height: usize,
	pub base_chunks: Layer<BaseChunk>,
	pub chunks: [Layer<SuperChunk>; LAYER_COUNT - 1],
	pub links: HashMap<LinkId, Link>,
	pub flood_start: LinkId,
	pub flood_goals: Vec<LinkId>,
	pub flood_goal_data: HashMap<LinkId, Path<LinkId>>,
	next_id: LinkId,
}

impl HPAMap {
	pub fn new(width: usize, height: usize, materials: &Materials) -> HPAMap {
		let width = width / CHUNK_SIZE;
		let height = height / CHUNK_SIZE;

		let mut base_chunks = Vec::with_capacity(width);
		let mut links = HashMap::new();
		let mut next_id = 0;

		for x in 0..width {
			let mut col = Vec::with_capacity(height);
			base_chunks.push(col);
			for y in 0..height {
				let pos = Point::new(x, y) * CHUNK_SIZE;

				let chunk = {
					let mut neighbors = [None; 4];
					neighbors[Dir::UP as usize] =
						base_chunks.get(x).and_then(|vec| vec.get(y - 1));
					neighbors[Dir::LEFT as usize] =
						base_chunks.get(x - 1).and_then(|vec| vec.get(y));

					BaseChunk::new(pos, materials, neighbors, &mut links, &mut next_id)
				};
				base_chunks[x].push(chunk);
			}
		}

		let base_chunks = Layer::new(base_chunks, 0);

		// TODO: implement
		let chunks = [Layer::new(vec![], 1)];

		HPAMap {
			width,
			height,
			base_chunks,
			chunks,
			links,
			flood_start: 0,
			flood_goals: vec![],
			flood_goal_data: HashMap::new(),
			next_id,
		}
	}

	pub fn empty() -> HPAMap {
		HPAMap {
			width: 0,
			height: 0,
			base_chunks: Layer::new(vec![], 0),
			chunks: [Layer::new(vec![], 0)],
			links: HashMap::new(),
			flood_start: 0,
			flood_goals: vec![],
			flood_goal_data: HashMap::new(),
			next_id: 0,
		}
	}

	pub fn link_at(&self, point: Point) -> Option<LinkId> {
		for link in self.links.values() {
			if link.pos == point {
				return Some(link.id);
			}
		}
		None
	}

	fn get_or_create_link(&mut self, point: Point, materials: &Materials) -> LinkId {
		self.link_at(point)
			.unwrap_or_else(|| self.insert(point, materials))
	}

	pub fn tile_changed(&mut self, tile: Point, materials: &Materials) {

		// TODO: make all layer changing

	}

	fn remove_link(&mut self, id: LinkId) {
		let link = self.links.remove(&id).unwrap();

		// TODO: make all layer changing

		for other in link.paths.keys() {
			self.links.get_mut(other).unwrap().paths.remove(&link.id);
		}
	}

	pub fn path_find(
		&mut self,
		start: Point,
		end: Point,
		materials: &Materials,
	) -> Option<Path<Point>> {
		if start == end {
			return Some(Path::new(vec![start], 0));
		}

		if start / CHUNK_SIZE == end / CHUNK_SIZE {
			let start_chunk = &self.base_chunks[start.x / CHUNK_SIZE][start.y / CHUNK_SIZE];
			return start_chunk.a_star(start, end, materials);
		}

		let start_link_id = self.get_or_create_link(start, materials);

		let end_link_id = self.get_or_create_link(end, materials);

		let path = self.a_star(start_link_id, end_link_id).map(|path| {
			let first = path[0];
			let second = path[1];
			let point_path = self.links[&first].path_to(second).unwrap();
			Path::new(point_path.path.clone(), path.cost)
		});

		path
	}

	fn insert(&mut self, point: Point, materials: &Materials) -> LinkId {
		let id;

		// TODO: make all layer changing
		{
			let chunk = &self.base_chunks[point.x / CHUNK_SIZE][point.y / CHUNK_SIZE];
			let material = materials[point.x][point.y];

			let walk_cost = {
				if !material.is_solid() {
					Some(material.walk_cost())
				} else {
					None
				}
			};

			let mut link = Link::new(self.next_id, point, walk_cost);
			self.next_id += 1;

			if link.is_solid() {
				for &other_id in chunk.links.iter() {
					if self.links[&other_id].is_solid() {
						continue;
					}
					let other_pos = self.links[&other_id].pos;
					let other_path = chunk.a_star(other_pos, point, materials);
					if let Some(other_path) = other_path {
						self.links
							.get_mut(&other_id)
							.unwrap()
							.paths
							.insert(link.id, other_path);
					}
				}
			} else {
				let links = vec![]; // TODO: implement
				let mut paths = BaseChunk::dijkstra(point, &links, chunk.pos(), materials);

				for &other_id in chunk.links.iter() {
					if self.links[&other_id].is_solid() {
						continue;
					}
					let other_pos = self.links[&other_id].pos;
					if let Some(path) = paths.remove(&other_pos) {
						let mut other_path = path.clone();
						other_path.path.reverse();
						other_path.cost -= material.walk_cost();
						other_path.cost += materials[other_pos.x][other_pos.y].walk_cost();

						link.paths.insert(other_id, path);

						self.links
							.get_mut(&other_id)
							.unwrap()
							.paths
							.insert(link.id, other_path);
					}
				}
			}

			id = link.id;
			self.links.insert(id, link);
		}

		{
			let chunk = &mut self.base_chunks[point.x / CHUNK_SIZE][point.y / CHUNK_SIZE];
			chunk.links.insert(id);
		}

		id
	}

	fn a_star(&self, start: LinkId, end: LinkId) -> Option<Path<LinkId>> {
		let end_point = self.links[&end].pos;

		let links = &self.links;

		let get_all_neighbors = |id: LinkId| links[&id].paths.keys().map(|&id| id);

		let get_cost = |id1: LinkId, id2: LinkId| links[&id1].path_to(id2).unwrap().cost;

		let is_walkable = |_| true;

		a_star_search(
			get_all_neighbors,
			get_cost,
			is_walkable,
			start,
			end,
			|id| links[&id].pos.dist(&end_point) as Cost,
		)
	}

	pub fn add_flood_goal(&mut self, point: Point, materials: &Materials) {
		let id = self.get_or_create_link(point, materials);
		self.flood_goals.push(id);
	}

	pub fn flood_search(&mut self, start: Point, materials: &Materials) {
		let start_id = self.get_or_create_link(start, materials);

		self.flood_start = start_id;

		let links = &self.links;

		let get_all_neighbors = |id: LinkId| links[&id].paths.keys().map(|&id| id);

		let get_cost = |id1: LinkId, id2: LinkId| links[&id1].path_to(id2).unwrap().cost;

		let is_walkable = |_| true;

		self.flood_goal_data = dijkstra_search(
			get_all_neighbors,
			get_cost,
			is_walkable,
			start_id,
			&self.flood_goals,
		);
	}

	pub fn flood_path_to(&self, id: LinkId) -> Option<Path<Point>> {
		self.flood_goal_data.get(&id).map(|path| {
			let first = path[0];
			let second = path[1];
			let point_path = self.links[&first].path_to(second).unwrap();
			Path::new(point_path.path.clone(), path.cost)
		})
	}

	pub fn end_flood_search(&mut self) {
		self.flood_goals.clear();
		self.flood_goal_data.clear();
	}
}
