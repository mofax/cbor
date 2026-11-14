import { describe, expect, test } from "bun:test";
import { CBOR } from "../main";
import { bytesFromHex } from "./hex";

describe("CBOR Bytes Tests", () => {
	test("empty byte array", () => {
		const original = new Uint8Array([]);
		const encoded = CBOR.pack(original);
		const decoded = CBOR.unpack(encoded);

		expect(decoded).toBeInstanceOf(Uint8Array);
		expect(Array.from(decoded as Uint8Array)).toEqual(Array.from(original));
	});

	test("small byte array", () => {
		const original = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
		const encoded = CBOR.pack(original);
		const decoded = CBOR.unpack(encoded);

		expect(decoded).toBeInstanceOf(Uint8Array);
		expect(Array.from(decoded as Uint8Array)).toEqual(Array.from(original));
	});

	test("byte array with all possible byte values", () => {
		const original = new Uint8Array(256);
		for (let i = 0; i < 256; i++) {
			original[i] = i;
		}

		const encoded = CBOR.pack(original);
		const decoded = CBOR.unpack(encoded);

		expect(decoded).toBeInstanceOf(Uint8Array);
		expect(Array.from(decoded as Uint8Array)).toEqual(Array.from(original));
	});

	test("large byte array (>255 bytes)", () => {
		const original = new Uint8Array(1000);
		for (let i = 0; i < 1000; i++) {
			original[i] = i % 256;
		}

		const encoded = CBOR.pack(original);
		const decoded = CBOR.unpack(encoded);

		expect(decoded).toBeInstanceOf(Uint8Array);
		expect(Array.from(decoded as Uint8Array)).toEqual(Array.from(original));
	});

	test("correct CBOR major type for bytes", () => {
		const original = new Uint8Array([0x42, 0x42, 0x42]);
		const encoded = CBOR.pack(original);

		// First byte should have major type 2 (0b010xxxxx)
		// For length 3, it should be 0x43 (0b01000011)
		expect(encoded[0]).toBe(0x43);
		expect(encoded[1]).toBe(0x42);
		expect(encoded[2]).toBe(0x42);
		expect(encoded[3]).toBe(0x42);
	});

	test("bytes in arrays", () => {
		const bytes1 = new Uint8Array([0x01, 0x02]);
		const bytes2 = new Uint8Array([0x03, 0x04]);
		const original = [bytes1, "test", bytes2];

		const encoded = CBOR.pack(original);
		const decoded = CBOR.unpack(encoded) as any[];

		expect(Array.isArray(decoded)).toBe(true);
		expect(decoded).toHaveLength(3);
		expect(decoded[0]).toBeInstanceOf(Uint8Array);
		expect(Array.from(decoded[0])).toEqual([0x01, 0x02]);
		expect(decoded[1]).toBe("test");
		expect(decoded[2]).toBeInstanceOf(Uint8Array);
		expect(Array.from(decoded[2])).toEqual([0x03, 0x04]);
	});

	test("bytes in maps", () => {
		const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
		const original = {
			data: bytes,
			name: "binary_data",
		};

		const encoded = CBOR.pack(original);
		const decoded = CBOR.unpack(encoded) as any;

		expect(typeof decoded).toBe("object");
		expect(decoded.data).toBeInstanceOf(Uint8Array);
		expect(Array.from(decoded.data)).toEqual([0xde, 0xad, 0xbe, 0xef]);
		expect(decoded.name).toBe("binary_data");
	});
});

describe("Tagged typed arrays (RFC 8746)", () => {
	type TypedArray = Uint16Array | Float32Array | Uint8ClampedArray | BigInt64Array;
	const packTypedArray = CBOR.pack as (
		value: TypedArray | { data: [TypedArray, number] },
	) => Uint8Array;

	test.each([
		["big-endian Uint16Array", "d8414400010100", Uint16Array.of(1, 256)],
		["little-endian Uint16Array", "d8454401000001", Uint16Array.of(1, 256)],
		["big-endian Float32Array", "d851483f800000c0200000", Float32Array.of(1, -2.5)],
		["little-endian Float32Array", "d855480000803f000020c0", Float32Array.of(1, -2.5)],
		["empty Float32Array", "d85140", Float32Array.of()],
		["Uint8ClampedArray", "d8444200ff", Uint8ClampedArray.of(0, 255)],
		[
			"BigInt64Array",
			"d84b50ffffffffffffffff7fffffffffffffff",
			BigInt64Array.of(-1n, 2n ** 63n - 1n),
		],
	] as const)("decodes %s with the correct element type and values", (_name, hex, values) => {
		const decoded = CBOR.unpack(bytesFromHex(hex));
		expect(decoded).toBeInstanceOf(values.constructor);
		expect<unknown>(decoded).toEqual(values);
	});

	test("encodes only the elements covered by a typed-array subview", () => {
		const view = Float32Array.of(99, 1, -2.5, 99).subarray(1, 3);
		const encoded = packTypedArray(view);
		expect([
			bytesFromHex("d851483f800000c0200000"),
			bytesFromHex("d855480000803f000020c0"),
		]).toContainEqual(encoded);
		const decoded = CBOR.unpack(encoded);
		expect(decoded).toBeInstanceOf(Float32Array);
		expect<unknown>(decoded).toEqual(Float32Array.of(1, -2.5));
	});

	test("round-trips a tagged typed array next to another value in a nested container", () => {
		const value = { data: [Uint16Array.of(1, 256), 3] } satisfies { data: [Uint16Array, number] };
		const decoded = CBOR.unpack(packTypedArray(value)) as { data: [Uint16Array, number] };
		expect(decoded.data[0]).toBeInstanceOf(Uint16Array);
		expect(decoded).toEqual(value);
	});

	test.each([
		["non-byte-string payload", "d85180"],
		["byte count that is not a multiple of the element width", "d85143000000"],
		["truncated payload", "d84144000101"],
	])("rejects a typed-array tag with a %s", (_name, hex) => {
		expect(() => CBOR.unpack(bytesFromHex(hex))).toThrow();
	});
});
