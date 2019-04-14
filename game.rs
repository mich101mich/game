#![allow(clippy::needless_range_loop)]

#[macro_use]
extern crate serde_derive;

use hierarchical_pathfinding::prelude::*;
use rand::Rng;
use wasm_bindgen::prelude::*;

use std::collections::HashMap;

mod rust_src;
use rust_src::*;

type HPAMap = PathCache<ManhattanNeighborhood>;

#[derive(Serialize)]
struct Path {
	path: Vec<Point>,
	cost: usize,
}
fn serialize(
	path: hierarchical_pathfinding::AbstractPath<ManhattanNeighborhood>,
) -> Path {
	let cost = path.cost();
	Path {
		path: path.map(Point::from).collect(),
		cost,
	}
}

static mut WIDTH: usize = 0;
static mut HEIGHT: usize = 0;

static mut MAZE: Maze = Maze {
	width: 0,
	height: 0,
	data: None,
};

#[wasm_bindgen]
extern "C" {
	#[wasm_bindgen(js_namespace = console)]
	fn log(s: &str);
}

macro_rules! log {
	( $( $x:expr ),* ) => {
		log(&format!($($x),*))
	};
}

pub fn width() -> usize {
	unsafe { WIDTH }
}
pub fn height() -> usize {
	unsafe { HEIGHT }
}

fn materials() -> &'static mut Materials {
	unsafe { &mut MAZE.materials }
}
fn visible() -> &'static mut Visible {
	unsafe { &mut MAZE.visible }
}
fn hpa_map() -> &'static mut HPAMap {
	unsafe { MAZE.hpa_map.as_mut().unwrap() }
}

fn cost_fn((x, y): (usize, usize)) -> isize {
	let material = get(x, y);
	if material.is_solid() {
		-1
	} else {
		material.walk_cost() as isize
	}
}

#[wasm_bindgen]
pub fn get(x: usize, y: usize) -> Material {
	materials()[x][y]
}

#[wasm_bindgen]
pub fn set(x: usize, y: usize, value: Material) {
	let materials = materials();
	let old = materials[x][y];
	materials[x][y] = value;
	if old.is_solid() != value.is_solid()
		|| (!old.is_solid() && old.walk_cost() != value.walk_cost())
	{
		hpa_map().tiles_changed(&[(x, y)], cost_fn);
	}
}

#[wasm_bindgen]
/// checks if a tile is solid
pub fn is_solid(x: usize, y: usize) -> bool {
	get(x, y).is_solid()
}

#[wasm_bindgen]
/// gets the walk cost of a tile
pub fn walk_cost(x: usize, y: usize) -> isize {
	get(x, y).walk_cost()
}

#[wasm_bindgen]
/// generates a Path from start to end
pub fn find_path(sx: usize, sy: usize, ex: usize, ey: usize) -> JsValue {
	let start = Point::new(sx, sy);
	let end = Point::new(ex, ey);

	// use Hierarchical Pathfinding for existence check and long range approximation
	let path = hpa_map().find_path(start.into(), end.into(), cost_fn);

	if let Some(path) = path {
		JsValue::from_serde(&serialize(path)).unwrap()
	} else {
		JsValue::null()
	}
}

#[wasm_bindgen]
pub fn find_paths(sx: usize, sy: usize, goals: JsValue) -> JsValue {
	let goals: Vec<Point> = goals.into_serde().expect("Invalid JsValue");
	let goals: Vec<(usize, usize)> = goals.into_iter().map(|p| (p.x, p.y)).collect();

	let paths = hpa_map().find_paths((sx, sy), &goals, cost_fn);

	let mut ret: HashMap<String, Path> = HashMap::new();
	for ((x, y), path) in paths {
		ret.insert(format!("{}:{}", x, y), serialize(path));
	}
	JsValue::from_serde(&ret).unwrap()
}

#[wasm_bindgen]
pub fn is_visible(x: usize, y: usize) -> bool {
	visible()[x][y]
}

#[wasm_bindgen]
pub fn set_visible(vx: usize, vy: usize) {
	let mut next = vec![(vx, vy)];
	let visible = &mut visible();

	while let Some((x, y)) = next.pop() {
		visible[x][y] = true;
		if is_solid(x, y) {
			continue;
		}
		if x > 0 && !visible[x - 1][y] {
			next.push((x - 1, y));
		}
		if x < width() - 1 && !visible[x + 1][y] {
			next.push((x + 1, y));
		}
		if y > 0 && !visible[x][y - 1] {
			next.push((x, y - 1));
		}
		if y < height() - 1 && !visible[x][y + 1] {
			next.push((x, y + 1));
		}
	}
}

// ========================================== Debug Info ==========================================

#[wasm_bindgen]
pub fn chunk_size() -> usize {
	hpa_map().config().chunk_size
}

#[wasm_bindgen]
pub fn node_positions() -> JsValue {
	let ret: Vec<Point> = hpa_map()
		.inspect_nodes()
		.map(|n| n.pos())
		.map(Point::from)
		.collect();

	JsValue::from_serde(&ret).unwrap()
}
#[wasm_bindgen]
pub fn node_neighbors(index: usize) -> JsValue {
	let ret: Vec<Point> = hpa_map()
		.inspect_nodes()
		.nth(index)
		.unwrap()
		.connected()
		.map(|c| c.pos())
		.map(Point::from)
		.collect();

	JsValue::from_serde(&ret).unwrap()
}

// =========================================== Game gen ===========================================

#[wasm_bindgen]
/// initializes the area. Please only call once!
pub fn init(width: usize, height: usize) {
	unsafe {
		WIDTH = width;
		HEIGHT = height;
		MAZE = Maze::new(width, height);
	}

	let mut rng = rand::thread_rng();

	let materials = materials();

	let min = width as f64 * height as f64 / 256.0;
	let max = width as f64 * height as f64 / 200.0;
	let cave_count = rng.gen_range(min, max) as usize;
	for _ in 0..cave_count {
		let x = rng.gen_range(0, width);
		let y = rng.gen_range(0, height);
		materials[x][y] = Air;
	}

	let radius = 2;
	for x in (width / 2 - radius)..(width / 2 + radius) {
		for y in (height / 2 - radius)..(height / 2 + radius) {
			if (width / 2 - x).pow(2) + (height / 2 - y).pow(2) < radius * radius {
				materials[x][y] = Air;
			}
		}
	}

	grow(Air, Bedrock, Air, 1.0);
	grow(Air, Bedrock, Air, 1.0);
	grow(Air, Bedrock, Air, 0.8);
	grow(Air, Bedrock, Air, 0.6);
	grow(Air, Bedrock, Air, 0.4);
	grow(Air, Bedrock, Air, 0.4);

	grow(Rock, Bedrock, Air, 1.0);
	grow(Rock, Bedrock, Rock, 0.6);
	grow(Rock, Bedrock, Rock, 0.5);
	grow(Rock, Bedrock, Rock, 0.3);
	grow(Rock, Bedrock, Rock, 0.3);

	grow(Rock, Air, Rock, 0.2);

	grow(Granite, Bedrock, Rock, 0.8);
	grow(Granite, Bedrock, Granite, 0.4);
	grow(Granite, Bedrock, Granite, 0.4);
	grow(Granite, Rock, Rock, 0.03);
	grow(Granite, Rock, Granite, 0.1);

	let min = width as f64 * height as f64 / 64.0;
	let max = width as f64 * height as f64 / 48.0;
	let ore_count = rng.gen_range(min, max) as i32;
	for _ in 0..ore_count {
		let x = rng.gen_range(0, width);
		let y = rng.gen_range(0, height);
		if materials[x][y] == Rock {
			materials[x][y] = Ore;
		}
	}

	grow(Ore, Rock, Ore, 0.23);
	grow(Ore, Rock, Ore, 0.23);

	let min = width as f64 * height as f64 / 80.0;
	let max = width as f64 * height as f64 / 64.0;
	let ore_count = rng.gen_range(min, max) as i32;
	for _ in 0..ore_count {
		let x = rng.gen_range(0, width);
		let y = rng.gen_range(0, height);
		if materials[x][y] == Rock {
			materials[x][y] = Crystal;
		}
	}

	grow(Crystal, Rock, Crystal, 0.14);
	grow(Crystal, Rock, Crystal, 0.14);

	for x in 0..width {
		materials[x][0] = Bedrock;
		materials[x][height - 1] = Bedrock;
	}
	for y in 0..height {
		materials[0][y] = Bedrock;
		materials[width - 1][y] = Bedrock;
	}

	set_visible(width / 2, height / 2);

	unsafe {
		MAZE.hpa_map = Some(HPAMap::new(
			(width, height),
			crate::cost_fn,
			ManhattanNeighborhood::new(width, height),
			Default::default(),
		));
	}

	log!("WebAssembly backend ready");
}

fn grow(material: Material, src: Material, neighbor: Material, odd_increase: f64) {
	let mut changes = vec![];
	let materials = materials();

	for x in 0..height() {
		for y in 0..width() {
			if materials[x][y] != src {
				continue;
			}
			let mut odds = 0.0;
			if x > 0 && materials[x - 1][y] == neighbor {
				odds += odd_increase;
			}
			if x < width() - 1 && materials[x + 1][y] == neighbor {
				odds += odd_increase;
			}
			if y > 0 && materials[x][y - 1] == neighbor {
				odds += odd_increase;
			}
			if y < height() - 1 && materials[x][y + 1] == neighbor {
				odds += odd_increase;
			}
			if rand::random::<f64>() <= odds {
				changes.push((x, y));
			}
		}
	}
	for (x, y) in changes {
		materials[x][y] = material;
	}
}
