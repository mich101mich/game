use rust_src::Cost;

#[derive(PartialEq, Eq, Clone, Copy, Debug)]
#[repr(u8)]
pub enum Material {
	Air,
	Bedrock,
	Granite,
	Rock,
	Ore,
	Crystal,
	Debris,
	Platform,
	Machine,
}
impl Material {
	pub fn is_solid(&self) -> bool {
		*self != Material::Air && *self != Material::Platform && *self != Material::Debris
	}
	pub fn walk_cost(&self) -> Cost {
		match self {
			&Air => 2,
			&Platform => 1,
			&Debris => 4,
			_ => 255,
		}
	}
}

pub use Material::*;
