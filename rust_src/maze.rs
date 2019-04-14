use super::Material;
use crate::HPAMap;

pub type Materials = Vec<Vec<Material>>;
pub type Visible = Vec<Vec<bool>>;

#[derive(Debug)]
pub struct Maze {
	pub width: usize,
	pub height: usize,
	pub data: Option<MazeData>,
}

impl Maze {
	pub fn new(width: usize, height: usize) -> Maze {
		Maze {
			width,
			height,
			data: Some(MazeData::new(width, height)),
		}
	}
}

#[derive(Debug)]
pub struct MazeData {
	pub width: usize,
	pub height: usize,
	pub materials: Materials,
	pub visible: Visible,
	pub hpa_map: Option<HPAMap>,
}

impl MazeData {
	pub fn new(width: usize, height: usize) -> MazeData {
		use std::iter::repeat;

		let materials = repeat(repeat(Material::Bedrock).take(height).collect())
			.take(width)
			.collect();

		let visible = repeat(repeat(false).take(height).collect())
			.take(width)
			.collect();

		MazeData {
			width,
			height,
			materials,
			visible,
			hpa_map: None,
		}
	}
}

use std::ops::*;

impl Deref for Maze {
	type Target = MazeData;
	fn deref(&self) -> &MazeData {
		self.data.as_ref().unwrap()
	}
}
impl DerefMut for Maze {
	fn deref_mut(&mut self) -> &mut MazeData {
		self.data.as_mut().unwrap()
	}
}
