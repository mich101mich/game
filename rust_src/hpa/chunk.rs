use super::{InterLink, LinkId};
use rust_src::{a_star_search, dijkstra_search, Cost, Dir, Materials, Path, Point};
use std::collections::HashMap;

pub const CHUNK_SIZE: usize = 8;

#[derive(Debug)]
pub struct Chunk {
	pub pos: Point,
	pub links: Vec<LinkId>,
}

impl Chunk {
	pub fn new(
		pos: Point,
		materials: &Materials,
		neighbors: [Option<&Chunk>; 4],
		all_links: &mut HashMap<LinkId, InterLink>,
		next_id: &mut LinkId,
	) -> Chunk {
		let mut links = vec![];

		for dir in 0..4 {
			let opp_dir = (dir + 2) % 4;

			if let Some(other) = neighbors[dir] {
				let opposites = other
					.links
					.iter()
					.filter(|id| all_links[id].sides[opp_dir])
					.collect::<Vec<&LinkId>>();

				for opposite in opposites {
					let point = all_links[opposite].pos.get_in_dir(opp_dir.into()).unwrap();

					let mut found_corner = false;
					for corner in links.iter() {
						if all_links[corner].pos != point {
							continue;
						}
						all_links
							.get_mut(corner)
							.unwrap()
							.add_neighbor(dir, *opposite);
						all_links
							.get_mut(opposite)
							.unwrap()
							.add_neighbor(opp_dir, *corner);

						found_corner = true;
						break;
					}
					if found_corner {
						continue;
					}

					let mut link = {
						let mut sides = [false; 4];
						let mut neighbors = [None; 4];
						sides[dir] = true;
						neighbors[dir] = Some(*opposite);
						let walk_cost = materials[point.x][point.y].walk_cost();
						InterLink::new(*next_id, point, walk_cost, sides, neighbors)
					};
					*next_id += 1;

					link.add_neighbor(dir, *opposite);
					all_links
						.get_mut(opposite)
						.unwrap()
						.add_neighbor(opp_dir, link.id);

					links.push(link.id);
					all_links.insert(link.id, link);
				}
				continue;
			}

			let next = ((dir + 1) % 4).into();

			let point = Point::from(match dir.into() {
				Dir::UP => (pos.x, pos.y),
				Dir::RIGHT => (pos.x + CHUNK_SIZE - 1, pos.y),
				Dir::DOWN => (pos.x + CHUNK_SIZE - 1, pos.y + CHUNK_SIZE - 1),
				Dir::LEFT => (pos.x, pos.y + CHUNK_SIZE - 1),
				_ => unreachable!(),
			});

			if point.get_in_dir(dir.into()).is_none() {
				continue;
			}

			let mut entrance = false;
			let mut entrance_start = 0;
			let mut entrance_end = 0;

			for i in 0..CHUNK_SIZE {
				let current = point.jump_in_dir(next, i).unwrap();
				let opposite = current.get_in_dir(dir.into()).unwrap();

				let mut finish_entrance = false;

				if !materials[current.x][current.y].is_solid()
					&& !materials[opposite.x][opposite.y].is_solid()
				{
					if !entrance {
						entrance = true;
						entrance_start = i;
					}
					if i == CHUNK_SIZE - 1 {
						finish_entrance = true;
						entrance_end = i + 1;
					}
				} else {
					finish_entrance = true;
					entrance_end = i;
				}

				if finish_entrance && entrance {
					entrance = false;
					let points: Vec<(Point, Point)> = (entrance_start..entrance_end)
						.map(|i| point.jump_in_dir(next, i).unwrap())
						.map(|p| (p, p.get_in_dir(dir.into()).unwrap()))
						.collect();
					let entrances = match points.len() {
						0 => unreachable!(),
						1 => points,
						2...4 => {
							let mut min = points[points.len() / 2];
							let mut min_cost = materials[min.0.x][min.0.y].walk_cost()
								+ materials[min.1.x][min.1.y].walk_cost();

							for &p in points.iter() {
								let cost = materials[p.0.x][p.0.y].walk_cost()
									+ materials[p.1.x][p.1.y].walk_cost();

								if cost < min_cost {
									min = p;
									min_cost = cost;
								}
							}
							vec![min]
						}
						_ => {
							let mut min = points[points.len() / 2];
							let mut min_cost = materials[min.0.x][min.0.y].walk_cost()
								+ materials[min.1.x][min.1.y].walk_cost();

							for &p in points[2..points.len() - 2].iter() {
								let cost = materials[p.0.x][p.0.y].walk_cost()
									+ materials[p.1.x][p.1.y].walk_cost();

								if cost < min_cost {
									min = p;
									min_cost = cost;
								}
							}
							vec![points[0], min, points[points.len() - 1]]
						}
					};

					for (point, _) in entrances {
						if let Some(corner) =
							links.iter().filter(|id| all_links[id].pos == point).next()
						{
							all_links.get_mut(corner).unwrap().sides[dir] = true;
							continue;
						}
						let link = {
							let mut sides = [false; 4];
							sides[dir] = true;
							let walk_cost = materials[point.x][point.y].walk_cost();
							InterLink::new(*next_id, point, walk_cost, sides, [None; 4])
						};
						*next_id += 1;
						links.push(link.id);
						all_links.insert(link.id, link);
					}
				}
			}
		}

		let my_link_ids: Vec<LinkId> = links.iter().map(|&id| id).collect();

		if !my_link_ids.is_empty() {
			let my_links: Vec<Point> = my_link_ids.iter().map(|id| all_links[id].pos).collect();

			for i in 0..(my_link_ids.len() - 1) {
				let current_id = my_link_ids[i];
				let current_pos = my_links[i];
				let mut paths = Chunk::dijkstra(current_pos, &my_links[(i + 1)..], pos, materials);

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
							.edges
							.insert(other_id, path);
						all_links
							.get_mut(&other_id)
							.unwrap()
							.edges
							.insert(current_id, other_path);
					}
				}
			}
		}

		Chunk { pos, links }
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
