use super::{get_chunk_pos, Chunk, Link, LinkId};
use rust_src::{a_star_search, dijkstra_search, Cost, Dir, Materials, Path, Point};
use std::collections::{HashMap, HashSet};

pub const CHUNK_SIZE: usize = 4;

#[derive(Debug)]
pub struct BaseChunk {
	pub pos: Point,
	pub links: HashSet<LinkId>,
	pub sides: [[Option<LinkId>; CHUNK_SIZE]; 4],
}

impl BaseChunk {
	pub fn new(
		pos: Point,
		materials: &Materials,
		neighbors: [Option<&BaseChunk>; 4],
		all_links: &mut HashMap<LinkId, Link>,
		next_id: &mut LinkId,
	) -> BaseChunk {
		let mut links = HashSet::new();
		let mut sides = [[None; CHUNK_SIZE]; 4];

		for dir in 0..4 {
			let next = ((dir + 1) % 4).into();

			let point = Point::from(match dir.into() {
				Dir::UP => (pos.x, pos.y),
				Dir::RIGHT => (pos.x + CHUNK_SIZE - 1, pos.y),
				Dir::DOWN => (pos.x + CHUNK_SIZE - 1, pos.y + CHUNK_SIZE - 1),
				Dir::LEFT => (pos.x, pos.y + CHUNK_SIZE - 1),
				_ => unreachable!(),
			});

			for i in 0..CHUNK_SIZE - 1 {
				// "CHUNK_SIZE - 1" => only add corners once

				let current = point.jump_in_dir(next, i).unwrap();
				if materials[current.x][current.y].is_solid() {
					continue;
				}

				let walk_cost = materials[current.x][current.y].walk_cost();
				let link = Link::new(*next_id, current, Some(walk_cost));
				*next_id += 1;

				links.insert(link.id);
				sides[dir][i] = Some(link.id);
				if i == 0 {
					// corners are part of both sides
					sides[(dir + 3) % 4][CHUNK_SIZE - 1] = Some(link.id);
				}
				all_links.insert(link.id, link);
			}
		}

		let chunk = BaseChunk { pos, links, sides };

		chunk.connect_links(all_links, materials);
		chunk.connect_to_neighbors(neighbors, all_links);

		chunk
	}

	pub fn connect_links(&self, all_links: &mut HashMap<LinkId, Link>, materials: &Materials) {
		let my_link_ids: Vec<LinkId> = self.links.iter().map(|&id| id).collect();

		if !my_link_ids.is_empty() {
			let my_links: Vec<Point> = my_link_ids.iter().map(|id| all_links[id].pos).collect();

			for i in 0..(my_link_ids.len() - 1) {
				let current_id = my_link_ids[i];
				let current_pos = my_links[i];
				let mut paths =
					BaseChunk::dijkstra(current_pos, &my_links[(i + 1)..], self.pos, materials);

				for j in (i + 1)..my_link_ids.len() {
					let other_pos = my_links[j];
					if let Some(path) = paths.remove(&other_pos) {
						let other_id = my_link_ids[j];
						let mut other_path = path.clone();
						other_path.path.reverse();
						other_path.cost += materials[other_pos.x][other_pos.y].walk_cost();
						other_path.cost -= materials[current_pos.x][current_pos.y].walk_cost();

						all_links
							.get_mut(&current_id)
							.unwrap()
							.paths
							.insert(other_id, path);
						all_links
							.get_mut(&other_id)
							.unwrap()
							.paths
							.insert(current_id, other_path);
					}
				}
			}
		}
	}

	pub fn connect_to_neighbors(
		&self,
		neighbors: [Option<&BaseChunk>; 4],
		all_links: &mut HashMap<LinkId, Link>,
	) {
		for dir in 0..4 {
			let opp_dir = (dir + 2) % 4;

			if let Some(other) = neighbors[dir] {
				let curr = self.sides[dir].iter();
				let opp = other.sides[opp_dir].iter().rev();
				let iter = curr
					.zip(opp)
					.filter(|(a, b)| a.is_some() && b.is_some())
					.map(|(a, b)| (a.unwrap(), b.unwrap()));

				for (a, b) in iter {
					let (path_a, path_b) = {
						let link_a = &all_links[&a];
						let link_b = &all_links[&b];

						let path_a =
							Path::new(vec![link_a.pos, link_b.pos], link_a.walk_cost.unwrap());
						let path_b =
							Path::new(vec![link_b.pos, link_a.pos], link_b.walk_cost.unwrap());

						(path_a, path_b)
					};
					all_links.get_mut(&a).unwrap().paths.insert(b, path_a);
					all_links.get_mut(&b).unwrap().paths.insert(a, path_b);
				}
			}
		}
	}

	pub fn remove_link(&mut self, id: LinkId) {
		self.links.remove(&id);
		self.sides
			.iter_mut()
			.flat_map(|side| side.iter_mut())
			.filter(|option| option.is_some())
			.for_each(|option| {
				if *option == Some(id) {
					*option = None
				}
			});
	}

	pub fn get_side_pos(&self, target: Point) -> (usize, usize) {
		for dir in 0..4 {
			let next = ((dir + 1) % 4).into();

			let point = Point::from(match dir.into() {
				Dir::UP => (self.pos.x, self.pos.y),
				Dir::RIGHT => (self.pos.x + CHUNK_SIZE - 1, self.pos.y),
				Dir::DOWN => (self.pos.x + CHUNK_SIZE - 1, self.pos.y + CHUNK_SIZE - 1),
				Dir::LEFT => (self.pos.x, self.pos.y + CHUNK_SIZE - 1),
				_ => unreachable!(),
			});

			for i in 0..CHUNK_SIZE - 1 {
				let current = point.jump_in_dir(next, i).unwrap();
				if current == target {
					return (dir, i);
				}
			}
		}
		unreachable!();
	}

	pub fn dijkstra(
		start: Point,
		goals: &[Point],
		offset: Point,
		materials: &Materials,
	) -> HashMap<Point, Path<Point>> {
		let left = offset.x;
		let top = offset.y;
		let right = left + CHUNK_SIZE;
		let bottom = top + CHUNK_SIZE;

		let get_all_neighbors = |p: Point| {
			p.neighbors()
				.filter(|o| o.x >= left && o.y >= top && o.x < right && o.y < bottom)
		};

		let get_cost = |p: Point, _: Point| materials[p.x][p.y].walk_cost();

		let is_walkable = |p: Point| !materials[p.x][p.y].is_solid();

		dijkstra_search(get_all_neighbors, get_cost, is_walkable, start, goals)
	}

	pub fn a_star(&self, start: Point, end: Point, materials: &Materials) -> Option<Path<Point>> {
		let left = self.pos.x;
		let top = self.pos.y;
		let right = left + CHUNK_SIZE;
		let bottom = top + CHUNK_SIZE;

		let get_all_neighbors = |p: Point| {
			p.neighbors()
				.filter(|o| o.x >= left && o.y >= top && o.x < right && o.y < bottom)
		};

		let get_cost = |p: Point, _: Point| materials[p.x][p.y].walk_cost();

		let is_walkable = |p: Point| !materials[p.x][p.y].is_solid();

		a_star_search(get_all_neighbors, get_cost, is_walkable, start, end, |p| {
			p.dist(&end) as Cost
		})
	}
}

impl Chunk for BaseChunk {
	fn pos(&self) -> Point {
		self.pos
	}
	fn layer(&self) -> usize {
		0
	}
	fn side(&self, side: ::rust_src::Dir) -> &[Option<LinkId>] {
		&self.sides[side as usize]
	}
}
