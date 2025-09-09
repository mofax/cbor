export const MAX_U64 = (1n << 64n) - 1n;

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
	Unsigned: 0 << 5,
	Negative: 1 << 5,
	Bytes: 2 << 5,
	Text: 3 << 5,
	Array: 4 << 5,
	Map: 5 << 5,
	Tag: 6 << 5,
	Simple: 7 << 5,
} as const;
