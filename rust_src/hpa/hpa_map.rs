use super::{Chunk, InterLink, LinkId, CHUNK_SIZE};
use rust_src::{a_star_search, dijkstra_search, Cost, Dir, Materials, Path, Point};
use std::collections::HashMap;

#[derive(Debug)]
pub struct HPAMap {
	pub width: usize,
	pub height: usize,
	pub chunks: Vec<Vec<Chunk>>,
	pub links: HashMap<LinkId, InterLink>,
	pub flood_start: LinkId,
	pub flood_goals: Vec<LinkId>,
	pub flood_goal_data: HashMap<LinkId, Path<LinkId>>,
	next_id: LinkId,
}

impl HPAMap {
	pub fn new(width: usize, height: usize, materials: &Materials) -> HPAMap {
		let width = width / CHUNK_SIZE;
		let height = height / CHUNK_SIZE;

		let mut chunks = Vec::with_capacity(width);
		let mut links = HashMap::new();
		let mut next_id = 0;

		for x in 0..width {
			let mut col = Vec::with_capacity(height);
			chunks.push(col);
			for y in 0..height {
				let pos = Point::new(x, y) * CHUNK_SIZE;

				let chunk = {
					let mut neighbours = [None; 4];
					neighbours[Dir::UP as usize] = chunks.get(x).and_then(|vec| vec.get(y - 1));
					neighbours[Dir::LEFT as usize] = chunks.get(x - 1).and_then(|vec| vec.get(y));

					Chunk::new(pos, materials, neighbours, &mut links, &mut next_id)
				};
				chunks[x].push(chunk);
			}
		}

		HPAMap {
			width,
			height,
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
			chunks: vec![],
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
	pub fn tile_changed(&mut self, tile: Point, materials: &Materials) {
		let p = tile / CHUNK_SIZE;
		{
			let chunk = &self.chunks[p.x][p.y];

			let mut marked = chunk.links.clone();
			for dir in (0..4).map(|i| i.into()) {
				if let Some(other) = p.get_in_dir(dir) {
					if other.x >= self.width || other.y >= self.height {
						continue;
					}
					for &id in self.chunks[other.x][other.y].links.iter() {
						marked.push(id);
					}
				}
			}

			for id in marked {
				if let Some(link) = self.links.remove(&id) {
					for outgoing in link.edges() {
						if let Some(neighbour) = self.links.get_mut(&outgoing) {
							neighbour.edges.remove(&id);
						}
					}
					for (dir, neighbour) in link.neighbours.iter().enumerate() {
						if let Some(neighbour) = neighbour {
							if let Some(neighbour) = self.links.get_mut(neighbour) {
								neighbour.neighbours[(dir + 2) % 4] = None;
							}
						}
					}
				}
			}
		}

		for dir in 0..4 {
			if let Some(point) = p.get_in_dir(dir.into()) {
				if point.x >= self.width || point.y >= self.height {
					continue;
				}
				let mut use_neighbour = [true; 4];
				use_neighbour[(dir + 2) % 4] = false;
				let chunk = self.create_chunk(point, use_neighbour, materials);
				self.chunks[point.x][point.y] = chunk;
			}
		}

		let chunk = self.create_chunk(p, [true; 4], materials);
		self.chunks[p.x][p.y] = chunk;

		self.id_check();
	}
	fn create_chunk(
		&mut self,
		point: Point,
		use_neighbour: [bool; 4],
		materials: &Materials,
	) -> Chunk {
		let pos = point * CHUNK_SIZE;
		let point = Point::from(point);

		let chunks = &self.chunks;

		let mut neighbours = [None; 4];
		for i in (0..4).filter(|&i| use_neighbour[i]) {
			neighbours[i] = point
				.get_in_dir(i.into())
				.and_then(|p| chunks.get(p.x).and_then(|vec| vec.get(p.y)));
		}

		Chunk::new(
			pos,
			materials,
			neighbours,
			&mut self.links,
			&mut self.next_id,
		)
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
			let start_chunk = &self.chunks[start.x / CHUNK_SIZE][start.y / CHUNK_SIZE];
			return start_chunk.a_star(start, end, materials);
		}

		let backup_next_id = self.next_id;

		let start_link_id = self
			.link_at(start)
			.unwrap_or_else(|| self.temp_insert(start, materials));

		let end_link_id = self
			.link_at(end)
			.unwrap_or_else(|| self.temp_insert(end, materials));

		let path = self.a_star(start_link_id, end_link_id).map(|path| {
			let first = path[0];
			let second = path[1];
			let point_path = self.links[&first].path_to(second).unwrap();
			Path::new(point_path.path.clone(), path.cost)
		});

		self.clear_temp();
		self.next_id = backup_next_id;

		path
	}
	fn temp_insert(&mut self, point: Point, materials: &Materials) -> LinkId {
		let id;

		{
			let chunk = &self.chunks[point.x / CHUNK_SIZE][point.y / CHUNK_SIZE];

			let links = chunk
				.links
				.iter()
				.map(|id| self.links[id].pos)
				.collect::<Vec<Point>>();

			let mut paths = Chunk::dijkstra(point, &links, chunk.pos, materials);

			let walk_cost = materials[point.x][point.y].walk_cost();
			let mut link = InterLink::temp(self.next_id, point, walk_cost, [false; 4], [None; 4]);
			self.next_id += 1;

			for &other_id in chunk.links.iter() {
				let other_pos = self.links[&other_id].pos;
				if let Some(path) = paths.remove(&other_pos) {
					let mut other_path = path.clone();
					other_path.path.reverse();
					other_path.cost -= materials[point.x][point.y].walk_cost();
					other_path.cost += materials[other_pos.x][other_pos.y].walk_cost();

					link.edges.insert(other_id, path);

					self.links
						.get_mut(&other_id)
						.unwrap()
						.temp_edges
						.insert(link.id, other_path);
				}
			}

			id = link.id;
			self.links.insert(id, link);
		}

		{
			let chunk = &mut self.chunks[point.x / CHUNK_SIZE][point.y / CHUNK_SIZE];
			chunk.links.push(id);
		}

		// check if we need to insert temp links in other chunks
		for other_pos in point.neighbours() {
			if other_pos / CHUNK_SIZE == point / CHUNK_SIZE
				|| materials[other_pos.x][other_pos.y].is_solid()
			{
				continue;
			}
			let other_id = self
				.link_at(other_pos)
				.unwrap_or_else(|| self.temp_insert(other_pos, materials));

			self.links
				.get_mut(&id)
				.unwrap()
				.add_neighbour(point.get_dir_to(other_pos).into(), other_id);
			self.links
				.get_mut(&other_id)
				.unwrap()
				.add_neighbour(other_pos.get_dir_to(point).into(), id);
		}

		id
	}
	fn clear_temp(&mut self) {
		let marked: Vec<LinkId> = self
			.links
			.values()
			.filter(|l| l.is_temp)
			.map(|l| l.id)
			.collect();

		for id in marked {
			for dir in 0..4 {
				if let Some(neighbour_id) = self.links[&id].neighbours[dir] {
					self.links
						.get_mut(&neighbour_id)
						.unwrap()
						.remove_neighbour((dir + 2) % 4);
				}
			}
		}

		let chunks = &mut self.chunks;
		let links = &mut self.links;

		chunks
			.iter_mut()
			.flat_map(|col| col.iter_mut())
			.for_each(|chunk| chunk.links.retain(|id| !links[id].is_temp));

		links.retain(|_, link| !link.is_temp);
		for (_, link) in links.iter_mut() {
			link.clear_temp();
		}
	}

	fn a_star(&self, start: LinkId, end: LinkId) -> Option<Path<LinkId>> {
		let end_point = self.links[&end].pos;

		let links = &self.links;

		let get_all_neighbours = |id: LinkId| links[&id].edges();

		let get_cost = |id1: LinkId, id2: LinkId| links[&id1].path_to(id2).unwrap().cost;

		let is_walkable = |_| true;

		a_star_search(
			get_all_neighbours,
			get_cost,
			is_walkable,
			start,
			end,
			|id| links[&id].pos.dist(&end_point) as Cost,
		)
	}

	fn id_check(&mut self) {
		if self.links.len() * 100 >= self.next_id {
			return; // only operate when actual count < 1% of next_id
		}
		let current: Vec<InterLink> = self.links.drain().map(|(_, link)| link).collect();
		let mut mapping = HashMap::with_capacity(current.len());
		for (i, mut link) in current.into_iter().enumerate() {
			mapping.insert(link.id, i);
			link.id = i;
			self.links.insert(link.id, link);
		}
		for link in self.links.values_mut() {
			let mut new = HashMap::with_capacity(link.edges.len());

			for (id, path) in link.edges.drain() {
				new.insert(mapping[&id], path);
			}
			link.edges = new;
		}
		self.chunks
			.iter_mut()
			.flat_map(|col| col.iter_mut())
			.flat_map(|chunk| chunk.links.iter_mut())
			.for_each(|link| *link = mapping[link]);

		self.next_id = self.links.len();
	}

	pub fn add_flood_goal(&mut self, point: Point, materials: &Materials) {
		let id = self
			.link_at(point)
			.unwrap_or_else(|| self.temp_insert(point, materials));
		self.flood_goals.push(id);
	}
	pub fn flood_search(&mut self, start: Point, materials: &Materials) {
		let start_id = self
			.link_at(start)
			.unwrap_or_else(|| self.temp_insert(start, materials));

		self.flood_start = start_id;

		let links = &self.links;

		let get_all_neighbours = |id: LinkId| links[&id].edges();

		let get_cost = |id1: LinkId, id2: LinkId| links[&id1].path_to(id2).unwrap().cost;

		let is_walkable = |_| true;

		self.flood_goal_data = dijkstra_search(
			get_all_neighbours,
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
		self.clear_temp();
	}
}
