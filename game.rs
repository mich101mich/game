mod rust_src;
use rust_src::*;

static mut WIDTH: usize = 0;
static mut HEIGHT: usize = 0;

static mut MAZE: Maze = Maze {
	width: 0,
	height: 0,
	data: None,
};

#[allow(dead_code)]
extern "C" {
	fn log_str(ptr: usize, len: usize);
	fn err_str(ptr: usize, len: usize);
	fn random() -> f64;
}

#[allow(dead_code)]
pub fn log(s: &str) {
	unsafe { log_str(s.as_ptr() as usize, s.len()) }
}
#[allow(dead_code)]
fn err(s: &str) {
	unsafe { err_str(s.as_ptr() as usize, s.len()) }
}
#[allow(dead_code)]
fn print_error(info: &std::panic::PanicInfo) {
	err(&format!("{}", info))
}

pub fn width() -> usize {
	unsafe { WIDTH }
}
pub fn height() -> usize {
	unsafe { HEIGHT }
}

fn maze_data() -> &'static mut MazeData {
	unsafe { &mut MAZE }
}
fn materials() -> &'static mut Materials {
	unsafe { &mut MAZE.materials }
}
fn visible() -> &'static mut Visible {
	unsafe { &mut MAZE.visible }
}
fn hpa_map() -> &'static mut HPAMap {
	unsafe { &mut MAZE.hpa_map }
}

#[no_mangle]
pub fn get(x: usize, y: usize) -> Material {
	materials()[x][y]
}

#[no_mangle]
pub fn set(x: usize, y: usize, value: Material) {
	let materials = materials();
	let old = materials[x][y];
	materials[x][y] = value;
	if old.is_solid() != value.is_solid() || old.walk_cost() != value.walk_cost() {
		hpa_map().tile_changed(Point::new(x, y), materials);
	}
}

#[no_mangle]
pub fn is_solid(x: usize, y: usize) -> bool {
	get(x, y).is_solid()
}

#[no_mangle]
pub fn walk_cost(x: usize, y: usize) -> Cost {
	get(x, y).walk_cost()
}

#[no_mangle]
pub fn find_path(sx: usize, sy: usize, ex: usize, ey: usize) -> i32 {
	let start = Point::new(sx, sy);
	let end = Point::new(ex, ey);

	if start == end {
		return (0 << 2) | Dir::NONE as i32 & 0b11;
	}

	let materials = materials();

	// use Hierarchical Pathfinding for existence check and long range approximation
	let path = hpa_map().path_find(start, end, materials);

	if let Some(path) = path {
		let dir = path[0].get_dir_to(path[1]);
		let cost = path.cost as i32;

		if path.cost > CHUNK_SIZE as Cost * Material::Air.walk_cost() * 2 {
			return (cost << 2) | dir as i32 & 0b11;
		}
	} else {
		return -1;
	}

	let get_all_neighbors = |p: Point| p.neighbors();

	let get_cost = |p: Point, _: Point| materials[p.x][p.y].walk_cost();

	let is_walkable = |p: Point| !materials[p.x][p.y].is_solid();

	let result = a_star_search(get_all_neighbors, get_cost, is_walkable, start, end, |p| {
		p.dist(&end) as Cost
	});

	if let Some(path) = result {
		let dir = path[0].get_dir_to(path[1]);
		let cost = path.cost as i32;

		(cost << 2) | dir as i32 & 0b11
	} else {
		-1
	}
}

#[no_mangle]
pub fn add_flood_goal(x: usize, y: usize) {
	hpa_map().add_flood_goal(Point::new(x, y), materials());
}
#[no_mangle]
pub fn flood_search(sx: usize, sy: usize) {
	hpa_map().flood_search(Point::new(sx, sy), materials());
}
#[no_mangle]
pub fn flood_path_to(ex: usize, ey: usize) -> i32 {
	let hpa_map = hpa_map();
	let end = Point::new(ex, ey);

	let end_id = hpa_map.link_at(end).expect("Invalid Goal");

	if end_id == hpa_map.flood_start {
		return (0 << 2) | Dir::NONE as i32 & 0b11;
	}

	let result = hpa_map.flood_path_to(end_id);
	if let Some(path) = result {
		let dir = path[0].get_dir_to(path[1]);
		let cost = path.cost as i32;

		(cost << 2) | dir as i32 & 0b11
	} else {
		-1
	}
}
#[no_mangle]
pub fn end_flood_search() {
	hpa_map().end_flood_search();
}

#[no_mangle]
pub fn is_visible(x: usize, y: usize) -> bool {
	visible()[x][y]
}

#[no_mangle]
pub fn set_visible(vx: usize, vy: usize) {
	let mut next = vec![(vx, vy)];
	let ref mut visible = visible();

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

fn rand_range(min: f64, max: f64) -> f64 {
	unsafe { random() * (max - min) + min }
}

fn rand_x() -> usize {
	(unsafe { random() } * width() as f64) as usize
}

fn rand_y() -> usize {
	(unsafe { random() } * height() as f64) as usize
}

#[no_mangle]
pub fn init(width: usize, height: usize) {
	std::panic::set_hook(Box::new(print_error));

	unsafe {
		WIDTH = width;
		HEIGHT = height;
		MAZE = Maze::new(WIDTH, HEIGHT);
	}

	let materials = materials();

	let min = width as f64 * height as f64 / 256.0;
	let max = width as f64 * height as f64 / 200.0;
	let cave_count = rand_range(min, max) as usize;
	for _ in 0..cave_count {
		let x = rand_x();
		let y = rand_y();
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
	let ore_count = rand_range(min, max) as i32;
	for _ in 0..ore_count {
		let x = rand_x();
		let y = rand_y();
		if materials[x][y] == Rock {
			materials[x][y] = Ore;
		}
	}

	grow(Ore, Rock, Ore, 0.23);
	grow(Ore, Rock, Ore, 0.23);

	let min = width as f64 * height as f64 / 80.0;
	let max = width as f64 * height as f64 / 64.0;
	let ore_count = rand_range(min, max) as i32;
	for _ in 0..ore_count {
		let x = rand_x();
		let y = rand_y();
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

	maze_data().gen_hpa_map();

	log("WebAssembly backend ready");
}

#[no_mangle]
pub fn gen_hpa_map() {
	maze_data().gen_hpa_map();
}
#[no_mangle]
pub fn chunk_size() -> usize {
	CHUNK_SIZE
}

static mut CURRENT_LINK_INDEX: usize = 0;
static mut CURRENT_LINK_EDGE: usize = 0;

#[no_mangle]
pub unsafe fn iter_links() {
	CURRENT_LINK_INDEX = 0;
}
#[no_mangle]
pub unsafe fn link_x() -> usize {
	let mut links = hpa_map().links.values();
	let link = links.nth(CURRENT_LINK_INDEX).unwrap();
	link.pos.x
}
#[no_mangle]
pub unsafe fn link_y() -> usize {
	let mut links = hpa_map().links.values();
	let link = links.nth(CURRENT_LINK_INDEX).unwrap();
	link.pos.y
}
#[no_mangle]
pub unsafe fn link_id() -> usize {
	let mut links = hpa_map().links.values();
	let link = links.nth(CURRENT_LINK_INDEX).unwrap();
	link.id
}
#[no_mangle]
pub unsafe fn next_link() -> bool {
	CURRENT_LINK_INDEX += 1;
	CURRENT_LINK_EDGE = 0;
	CURRENT_LINK_INDEX < hpa_map().links.len()
}

#[no_mangle]
pub unsafe fn connection_x() -> usize {
	let mut links = hpa_map().links.values();
	let link = links.nth(CURRENT_LINK_INDEX).unwrap();
	let other = link.edges.keys().nth(CURRENT_LINK_EDGE).unwrap();
	hpa_map().links[&other].pos.x
}
#[no_mangle]
pub unsafe fn connection_y() -> usize {
	let mut links = hpa_map().links.values();
	let link = links.nth(CURRENT_LINK_INDEX).unwrap();
	let other = link.edges.keys().nth(CURRENT_LINK_EDGE).unwrap();
	hpa_map().links[&other].pos.y
}
#[no_mangle]
pub unsafe fn connection_cost() -> Cost {
	let mut links = hpa_map().links.values();
	let link = links.nth(CURRENT_LINK_INDEX).unwrap();
	link.edges.values().nth(CURRENT_LINK_EDGE).unwrap().cost
}
#[no_mangle]
pub unsafe fn next_connection() -> bool {
	CURRENT_LINK_EDGE += 1;
	let mut links = hpa_map().links.values();
	let link = links.nth(CURRENT_LINK_INDEX).unwrap();
	CURRENT_LINK_EDGE < link.edges.len()
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
			if unsafe { random() } <= odds {
				changes.push((x, y));
			}
		}
	}
	for (x, y) in changes {
		materials[x][y] = material;
	}
}
