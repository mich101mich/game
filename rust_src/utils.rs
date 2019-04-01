use super::{Cost, Path};
use std::collections::HashMap;

pub fn ordered_insert<T, V, F>(vector: &mut Vec<T>, element: T, get_value: F)
where
	V: Ord,
	F: Fn(&T) -> V,
{
	let value = get_value(&element);
	let pos = vector
		.binary_search_by(|x| value.cmp(&get_value(x)))
		.unwrap_or_else(|pos| pos);
	vector.insert(pos, element);
}

pub fn a_star_search<Id, GetNeighbours, NeighbourIter, GetCost, IsWalkable, Heuristic>(
	get_all_neighbours: GetNeighbours,
	get_cost: GetCost,
	is_walkable: IsWalkable,
	start: Id,
	goal: Id,
	heuristic: Heuristic,
) -> Option<Path<Id>>
where
	Id: Copy + ::std::cmp::Eq + ::std::hash::Hash,
	GetNeighbours: Fn(Id) -> NeighbourIter,
	NeighbourIter: Iterator<Item = Id>,
	GetCost: Fn(Id, Id) -> Cost,
	Heuristic: Fn(Id) -> Cost,
	IsWalkable: Fn(Id) -> bool,
{
	if start == goal {
		return Some(Path::new(vec![start, start], 0));
	}
	let mut visited = HashMap::new();
	let mut next = vec![(start, 0)];
	visited.insert(start, (0, start));

	'search: while let Some((current_id, _)) = next.pop() {
		if current_id == goal {
			break 'search;
		}
		let current_cost = visited[&current_id].0;

		for other_id in get_all_neighbours(current_id) {
			let other_cost = current_cost + get_cost(current_id, other_id);

			if !is_walkable(other_id) {
				if other_id == goal {
					visited.insert(other_id, (other_cost, current_id));
					break 'search;
				}
				continue;
			}

			let heuristic = heuristic(other_id);

			if let Some(&(prev_cost, _)) = visited.get(&other_id) {
				if prev_cost > other_cost {
					next.retain(|&(id, _)| id != other_id);
				}
			}

			if !visited.contains_key(&other_id) || visited[&other_id].0 > other_cost {
				ordered_insert(
					&mut next,
					(other_id, other_cost + heuristic),
					|&(_, cost)| cost,
				);
				visited.insert(other_id, (other_cost, current_id));
			}
		}
	}

	if !visited.contains_key(&goal) {
		return None;
	}

	let steps = {
		let mut steps = vec![];
		let mut current = goal;

		while current != start {
			steps.push(current);
			let (_, prev) = visited[&current];
			current = prev;
		}
		steps.push(start);
		steps.reverse();
		steps
	};

	Some(Path::new(steps, visited[&goal].0))
}

pub fn dijkstra_search<Id, GetNeighbours, NeighbourIter, GetCost, IsWalkable>(
	get_all_neighbours: GetNeighbours,
	get_cost: GetCost,
	is_walkable: IsWalkable,
	start: Id,
	goals: &[Id],
) -> HashMap<Id, Path<Id>>
where
	Id: Copy + ::std::cmp::Eq + ::std::hash::Hash + ::std::fmt::Debug,
	GetNeighbours: Fn(Id) -> NeighbourIter,
	NeighbourIter: Iterator<Item = Id>,
	GetCost: Fn(Id, Id) -> Cost,
	IsWalkable: Fn(Id) -> bool,
{
	let mut visited = ::std::collections::HashMap::new();
	let mut next = vec![(start, 0)];
	visited.insert(start, (0, start));

	let mut valid_goals = vec![];
	let mut solid_goals = vec![];
	for &goal_id in goals {
		if is_walkable(goal_id) {
			valid_goals.push(goal_id);
		} else {
			solid_goals.push(goal_id);
		}
	}

	let mut goal_costs = HashMap::with_capacity(goals.len());

	while let Some((current_id, _)) = next.pop() {
		let cost = visited[&current_id].0;

		for &goal_id in valid_goals.iter() {
			if current_id == goal_id {
				goal_costs.insert(goal_id, cost);
			}
		}
		valid_goals.retain(|&id| id != current_id);
		if valid_goals.is_empty() && solid_goals.is_empty() {
			break;
		}

		for other_id in get_all_neighbours(current_id) {
			let other_cost = cost + get_cost(current_id, other_id);

			if !is_walkable(other_id) {
				for &goal_id in solid_goals.iter() {
					if other_id == goal_id
						&& (!goal_costs.contains_key(&other_id)
							|| goal_costs[&other_id] > other_cost)
					{
						visited.insert(other_id, (other_cost, current_id));
						goal_costs.insert(other_id, other_cost);
					}
				}
				continue;
			}

			if let Some(&(prev_cost, _)) = visited.get(&other_id) {
				if prev_cost > other_cost {
					next.retain(|&(id, _)| id != other_id);
				}
			}

			if !visited.contains_key(&other_id) || visited[&other_id].0 > other_cost {
				ordered_insert(&mut next, (other_id, other_cost), |&(_, cost)| cost);
				visited.insert(other_id, (other_cost, current_id));
			}
		}
	}

	let mut goal_data = HashMap::with_capacity(goal_costs.len());

	for (&goal, &cost) in goal_costs.iter() {
		let steps = {
			let mut steps = vec![];
			let mut current = goal;

			while current != start {
				steps.push(current);
				let (_, prev) = visited[&current];
				current = prev;
			}
			steps.push(start);
			steps.reverse();
			steps
		};
		goal_data.insert(goal, Path::new(steps, cost));
	}

	goal_data
}
