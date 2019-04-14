use super::{Dir, DOWN, LEFT, RIGHT, UP};

#[derive(Serialize, Deserialize, PartialEq, Eq, Clone, Copy, Hash, Debug)]
#[repr(C)]
pub struct Point {
	pub x: usize,
	pub y: usize,
}

impl Point {
	pub fn new(x: usize, y: usize) -> Point {
		Point { x, y }
	}
	pub fn dist(&self, other: &Point) -> usize {
		((self.x as i32 - other.x as i32).abs() + (self.y as i32 - other.y as i32).abs()) as usize
	}
	pub fn get_in_dir(&self, dir: Dir) -> Option<Point> {
		self.jump_in_dir(dir, 1)
	}
	pub fn jump_in_dir(&self, dir: Dir, distance: usize) -> Option<Point> {
		match dir {
			UP => {
				if self.y >= distance {
					Some(Point::new(self.x, self.y - distance))
				} else {
					None
				}
			}
			DOWN => {
				if self.y + distance < crate::height() {
					Some(Point::new(self.x, self.y + distance))
				} else {
					None
				}
			}
			LEFT => {
				if self.x >= distance {
					Some(Point::new(self.x - distance, self.y))
				} else {
					None
				}
			}
			RIGHT => {
				if self.x + distance < crate::width() {
					Some(Point::new(self.x + distance, self.y))
				} else {
					None
				}
			}
			_ => None,
		}
	}
	pub fn get_dir_to(&self, other: Point) -> Dir {
		if other.x > self.x {
			Dir::RIGHT
		} else if other.x < self.x {
			Dir::LEFT
		} else if other.y > self.y {
			Dir::DOWN
		} else {
			Dir::UP
		}
	}
	pub fn neighbors(&self) -> Neighbors {
		Neighbors::new(*self)
	}
}

#[derive(Debug)]
pub struct Neighbors(Point, usize);
impl Neighbors {
	pub fn new(point: Point) -> Neighbors {
		Neighbors(point, 0)
	}
}
impl ::std::iter::Iterator for Neighbors {
	type Item = Point;
	fn next(&mut self) -> Option<Point> {
		if self.1 >= 4 {
			None
		} else {
			let ret = self.0.get_in_dir(self.1.into());
			self.1 += 1;
			ret.or_else(|| self.next())
		}
	}
}

impl From<(usize, usize)> for Point {
	fn from((x, y): (usize, usize)) -> Point {
		Point::new(x, y)
	}
}
impl Into<(usize, usize)> for Point {
	fn into(self) -> (usize, usize) {
		(self.x, self.y)
	}
}

use std::fmt::{Display, Formatter, Result};
use std::ops::{Add, Div, Mul, Sub};

impl Display for Point {
	fn fmt(&self, w: &mut Formatter<'_>) -> Result {
		write!(w, "({}, {})", self.x, self.y)
	}
}

impl Add<Point> for Point {
	type Output = Point;
	fn add(self, rhs: Point) -> Point {
		Point {
			x: self.x + rhs.x,
			y: self.y + rhs.y,
		}
	}
}
impl Sub<Point> for Point {
	type Output = Point;
	fn sub(self, rhs: Point) -> Point {
		Point {
			x: self.x - rhs.x,
			y: self.y - rhs.y,
		}
	}
}

impl Mul<usize> for Point {
	type Output = Point;
	fn mul(self, rhs: usize) -> Point {
		Point {
			x: self.x * rhs,
			y: self.y * rhs,
		}
	}
}
impl Div<usize> for Point {
	type Output = Point;
	fn div(self, rhs: usize) -> Point {
		Point {
			x: self.x / rhs,
			y: self.y / rhs,
		}
	}
}
