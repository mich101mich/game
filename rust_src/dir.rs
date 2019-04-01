#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Dir {
	UP,
	RIGHT,
	DOWN,
	LEFT,
	NONE,
}
pub use Dir::*;

macro_rules! impl_from_into {
	($type:tt) => {
		impl From<$type> for Dir {
			fn from(val: $type) -> Dir {
				match val {
					0 => UP,
					1 => RIGHT,
					2 => DOWN,
					3 => LEFT,
					_ => NONE,
				}
			}
		}
		impl Into<$type> for Dir {
			fn into(self) -> $type {
				self as $type
			}
		}
	};
}

impl_from_into!(u8);
impl_from_into!(u16);
impl_from_into!(u32);
impl_from_into!(u64);
impl_from_into!(usize);
impl_from_into!(i8);
impl_from_into!(i16);
impl_from_into!(i32);
impl_from_into!(i64);
impl_from_into!(isize);
