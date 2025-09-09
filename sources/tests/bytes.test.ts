import { describe, expect, test } from "bun:test";
import { CBOR } from "../main";

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
