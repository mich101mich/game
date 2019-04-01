pub type Cost = u32;

#[derive(Debug, Clone)]
pub struct Path<P> {
	pub path: Vec<P>,
	pub cost: Cost,
}

impl<P> Path<P> {
	pub fn new(path: Vec<P>, cost: Cost) -> Path<P> {
		Path { path, cost }
	}
}

use std::ops::*;

impl<P> Index<usize> for Path<P> {
	type Output = P;
	fn index(&self, index: usize) -> &P {
		&self.path[index]
	}
}
