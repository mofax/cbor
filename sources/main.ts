import type { CBORIO, DecodeOptions, EncodeOptions } from "./common/codec.js";
import { packValue, packSequence } from "./common/encoder.js";
import { CompleteReader } from "./common/reader.js";
import { unpackStream } from "./common/stream.js";
import { CBORTag } from "./common/tags.js";
import { CBORSimple } from "./types/simple.js";

export type {
	CBORArray,
	CBORIO,
	CBORMap,
	CBORObject,
	DecodeOptions,
	EncodeOptions,
} from "./common/codec.js";
export type { CBORTag } from "./common/tags.js";
export type { CBORSimple } from "./types/simple.js";
export type { CBORTypedArray } from "./types/typedarray.js";

export const CBOR = {
	/**
	 * Encodes one JavaScript value as a CBOR item.
	 *
	 * @param value - A supported scalar, byte string, typed array, date, tagged value, array, plain object, or map.
	 * Nested values and map keys can also be supported CBOR values.
	 * @param options - Encoding options that also apply to nested values.
	 * @returns The bytes of the encoded item.
	 *
	 * @remarks
	 * By default, strings, byte strings, arrays, and maps use definite lengths. Set
	 * `options.indefinite` to use break-terminated encodings for these types. Set
	 * `options.deterministic` to sort map keys lexicographically by their encoded bytes
	 * and use the shortest floating-point width that preserves each value.
	 *
	 * Use `bigint` for integers outside JavaScript's safe-integer range. A `Uint8Array`
	 * encodes as a byte string, while other supported typed arrays use semantic tags.
	 *
	 * @throws If both encoding options are enabled, a value cannot be encoded, or a map contains duplicate keys.
	 *
	 * @example
	 * ```ts
	 * const bytes = CBOR.pack({ z: 1, a: 0.5 }, { deterministic: true });
	 * ```
	 */
	pack(value: CBORIO, options?: EncodeOptions): Uint8Array {
		return packValue(value, options);
	},

	/**
	 * Decodes exactly one CBOR item from a byte array.
	 *
	 * @param data - The bytes of one complete item. A subarray contributes only the bytes in its view.
	 * @param options - Optional tag handlers that receive decoded payloads and take precedence over built-in
	 * tag handling for this call.
	 * @returns The decoded value. Maps with only text keys become plain objects. Maps with other keys become
	 * `Map` instances.
	 *
	 * @remarks
	 * Both definite and indefinite lengths are accepted. Basic integers outside JavaScript's safe-integer
	 * range and integers carried by bignum tags decode as `bigint`. Tags without a built-in or supplied
	 * handler decode as wrappers with `tag` and `value` properties.
	 *
	 * @throws If the input is empty, truncated, or malformed, contains duplicate map keys, or has trailing bytes.
	 * Errors thrown by a tag handler propagate to the caller.
	 *
	 * @example
	 * ```ts
	 * const bytes = CBOR.pack(CBOR.tag(80_000, [1, 2]));
	 * const value = CBOR.unpack(bytes, {
	 *   tagHandlers: new Map([[80_000, (payload) => ({ coordinates: payload })]]),
	 * });
	 * // value is { coordinates: [1, 2] }
	 * ```
	 */
	unpack(data: Uint8Array, options?: DecodeOptions): CBORIO {
		if (data.length === 0) {
			throw new Error("Cannot unpack empty data");
		}

		const reader = new CompleteReader(data, options);
		const value = reader.readItem();
		if (reader.offset !== data.length) {
			throw new Error(`Unexpected trailing data at offset ${reader.offset}`);
		}

		return value;
	},

	/**
	 * Wraps a value with a CBOR semantic tag number.
	 *
	 * @param tag - An unsigned integer from zero through `2n ** 64n - 1n`. Use a `bigint`
	 * for tag numbers outside JavaScript's safe-integer range.
	 * @param value - The payload to encode after the tag.
	 * @returns A tagged value that can be passed to {@link CBOR.pack} or nested inside another value.
	 *
	 * @remarks
	 * The encoder validates the tag number when it packs the wrapper. A plain object with
	 * `tag` and `value` properties encodes as a map.
	 *
	 * @example
	 * ```ts
	 * const bytes = CBOR.pack(CBOR.tag(80_000, [1, 2]));
	 * ```
	 */
	tag(tag: number | bigint, value: CBORIO): CBORTag {
		return new CBORTag(tag, value);
	},

	/**
	 * Wraps a numeric CBOR simple-value code for encoding.
	 *
	 * @param code - An integer from 0 through 23 or from 32 through 255. Codes 24 through 31 are reserved.
	 * @returns A simple value that can be passed to {@link CBOR.pack} or nested inside another value.
	 *
	 * @remarks
	 * The encoder validates the code when it packs the wrapper. Codes 20 through 23 decode as
	 * `false`, `true`, `null`, and `undefined`, respectively. Other supported codes decode as
	 * wrappers with a `code` property.
	 *
	 * @example
	 * ```ts
	 * const bytes = CBOR.pack(CBOR.simple(32)); // Uint8Array.of(0xf8, 0x20)
	 * ```
	 */
	simple(code: number): CBORSimple {
		return new CBORSimple(code);
	},

	/**
	 * Encodes an iterable as a sequence of consecutive top-level CBOR items.
	 *
	 * @param items - Values to encode in iteration order. Repeated values are encoded each time they appear.
	 * @param options - The {@link CBOR.pack} encoding options, applied to every item in the sequence.
	 * @returns The concatenated item bytes, or an empty byte array for an empty iterable.
	 *
	 * @remarks
	 * Each item is self-delimiting. The sequence contains no enclosing array or length prefix.
	 *
	 * @throws If an item cannot be encoded, the encoding options conflict, or the input iterator throws.
	 *
	 * @example
	 * ```ts
	 * const bytes = CBOR.packSequence([1, 1, null]); // Uint8Array.of(0x01, 0x01, 0xf6)
	 * ```
	 */
	packSequence(items: Iterable<CBORIO>, options?: EncodeOptions): Uint8Array {
		return packSequence(items, options);
	},

	/**
	 * Decodes all consecutive top-level CBOR items in a byte array.
	 *
	 * @param data - The sequence bytes. A subarray contributes only the bytes in its view.
	 * @param options - Optional tag handlers applied to every item, with the same precedence as {@link CBOR.unpack}.
	 * @returns The decoded items in wire order, or an empty array for empty input.
	 *
	 * @throws If any item is malformed or the sequence ends partway through an item.
	 * Errors thrown by a tag handler propagate to the caller.
	 *
	 * @example
	 * ```ts
	 * const values = CBOR.unpackSequence(Uint8Array.of(0x01, 0x81, 0x02)); // [1, [2]]
	 * ```
	 */
	unpackSequence(data: Uint8Array, options?: DecodeOptions): CBORIO[] {
		const values: CBORIO[] = [];
		const reader = new CompleteReader(data, options);
		while (reader.offset < data.length) {
			values.push(reader.readItem());
		}
		return values;
	},

	/**
	 * Incrementally decodes a CBOR sequence from byte chunks.
	 *
	 * @param chunks - A synchronous or asynchronous iterable of byte chunks. An item may span multiple chunks,
	 * and a chunk may contain multiple items. Empty chunks are skipped.
	 * @param options - Optional tag handlers applied to every item, with the same precedence as {@link CBOR.unpack}.
	 * @returns An async generator that yields each decoded item in wire order.
	 *
	 * @remarks
	 * The generator yields all complete items available in the current chunk before requesting more input.
	 * An empty stream yields no values.
	 *
	 * @throws During iteration if malformed data is detected or the input ends partway through an item.
	 * Errors from the source iterable or a tag handler propagate through the generator.
	 *
	 * @example
	 * ```ts
	 * const chunks = [Uint8Array.of(0x19, 0x01), Uint8Array.of(0x00, 0xf6)];
	 * for await (const value of CBOR.unpackStream(chunks)) {
	 *   console.log(value); // 256, then null
	 * }
	 * ```
	 */
	unpackStream,
};
