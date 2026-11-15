export const MAX_U64 = (1n << 64n) - 1n;
export const INDEFINITE_LENGTH = 31;
export const BREAK = 0xff;

/**
 * Represents the major types in the CBOR (Concise Binary Object Representation) encoding format.
 *
 * Each value corresponds to a major type, encoded in the top 3 bits of a CBOR data item.
 * The binary shifts (<< 5) in your are used to position the values in the upper 3 bits of a byte (8 bits).
 *
 * - `Unsigned`: Unsigned integer (major type 0)
 * - `Negative`: Negative integer (major type 1)
 * - `Bytes`: Byte string (major type 2)
 * - `Text`: UTF-8 text string (major type 3)
 * - `Array`: Array of data items (major type 4)
 * - `Map`: Map of pairs (major type 5)
 * - `Tag`: Semantic tagging (major type 6)
 * - `Simple`: Simple values and floating-point numbers (major type 7)
 */
export const Major = {
	Unsigned: 0x00,
	Negative: 0x20,
	Bytes: 0x40,
	Text: 0x60,
	Array: 0x80,
	Map: 0xa0,
	Tag: 0xc0,
	Simple: 0xe0,
} as const;
