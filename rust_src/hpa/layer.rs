use super::{get_chunk_size, Chunk};
use rust_src::Point;

#[derive(Debug)]
pub struct Layer<ChunkType: Chunk> {
	chunks: Vec<Vec<ChunkType>>,
	layer: usize,
}

impl<ChunkType: Chunk> Layer<ChunkType> {
	pub fn new(chunks: Vec<Vec<ChunkType>>, layer: usize) -> Layer<ChunkType> {
		Layer { chunks, layer }
	}

	pub fn get_chunk(&self, pos: Point) -> &ChunkType {
		let pos = pos / get_chunk_size(self.layer);
		&self.chunks[pos.x][pos.y]
	}
}

impl<ChunkType: Chunk> ::std::ops::Deref for Layer<ChunkType> {
	type Target = Vec<Vec<ChunkType>>;
	fn deref(&self) -> &Vec<Vec<ChunkType>> {
		&self.chunks
	}
}
impl<ChunkType: Chunk> ::std::ops::DerefMut for Layer<ChunkType> {
	fn deref_mut(&mut self) -> &mut Vec<Vec<ChunkType>> {
		&mut self.chunks
	}
}
