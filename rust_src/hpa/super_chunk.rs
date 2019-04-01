use super::{Chunk, LinkId};
use rust_src::Point;
use std::collections::HashSet;

#[derive(Debug)]
pub struct SuperChunk {
	pos: Point,
	layer: usize,
	chunk_size: usize,
	pub links: HashSet<LinkId>,
	sides: [Vec<Option<LinkId>>; 4],
}

impl Chunk for SuperChunk {
	fn pos(&self) -> Point {
		self.pos
	}
	fn layer(&self) -> usize {
		self.layer
	}
	fn side(&self, side: ::rust_src::Dir) -> &[Option<LinkId>] {
		&self.sides[side as usize]
	}
}
