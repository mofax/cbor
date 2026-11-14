import { describe, expect, test } from "bun:test";
import { CBOR, type CBORIO } from "../main";
import { bytesFromHex } from "./hex";

describe("Decoding definite-length data", () => {
	test("reads the next sibling after a nested value encoded with a wider header", () => {
		expect(CBOR.unpack(bytesFromHex("8281180102"))).toEqual([[1], 2]);
		expect(CBOR.unpack(bytesFromHex("82b8016161180102")))
			.toEqual([{ a: 1 }, 2]);
		expect(CBOR.unpack(bytesFromHex("82a2616181180161620203"))).toEqual([{ a: [1], b: 2 }, 3]);
	});

	test("accepts wide text and byte string headers", () => {
		const bytes = bytesFromHex("006b");
		const input = bytesFromHex("827b0000000000000001615b0000000000000002006b");
		expect(CBOR.unpack(input)).toEqual(["a", bytes]);
	});

	test("respects the bounds of a Uint8Array view", () => {
		const backing = bytesFromHex("0019010000");
		expect(CBOR.unpack(backing.subarray(1, 4))).toBe(256);
		expect(() => CBOR.unpack(backing.subarray(1, 3))).toThrow();
	});

	test("rejects empty input, truncation, and trailing data", () => {
		for (const hex of ["", "18", "63abcd", "42ab", "8181", "a16161", "c1", "f93e"]) {
			expect(() => CBOR.unpack(bytesFromHex(hex))).toThrow();
		}
		for (const hex of ["0102", "810102", "a000", "c10102"]) {
			expect(() => CBOR.unpack(bytesFromHex(hex))).toThrow("Unexpected trailing data");
		}
	});

	test("preserves an initial U+FEFF and rejects invalid UTF-8", () => {
		expect(CBOR.unpack(CBOR.pack("\uFEFFa"))).toBe("\uFEFFa");
		expect(() => CBOR.unpack(bytesFromHex("61ff"))).toThrow();
	});

	test("accepts float16 and float32, and preserves signed zero", () => {
		expect(CBOR.unpack(bytesFromHex("82f93800fa3fc00000"))).toEqual([0.5, 1.5]);
		expect(Object.is(CBOR.unpack(CBOR.pack(-0)), -0)).toBe(true);
	});

	test("rejects integers outside the safe range in either direction", () => {
		for (const hex of ["1b0020000000000000", "3b001fffffffffffff"]) {
			expect(() => CBOR.unpack(bytesFromHex(hex))).toThrow("safe integer range");
		}
	});
});

describe("Map and nested value handling", () => {
	test("supports byte strings at any depth", () => {
		const value = { items: [{ data: [new Uint8Array([1, 2])] }] } satisfies CBORIO;
		expect(CBOR.unpack(CBOR.pack(value))).toEqual(value);
	});

	test("rejects JavaScript Map instances at any depth", () => {
		const map = new Map([["a", 1]]) as unknown as CBORIO;
		expect(() => CBOR.pack(map)).toThrow("require plain objects");
		expect(() => CBOR.pack({ nested: [map] })).toThrow("require plain objects");
	});

	test("keeps __proto__ as an own property on decoded objects", () => {
		const value = { ["__proto__"]: { a: 1 } };
		const decoded = CBOR.unpack(CBOR.pack(value)) as object;
		expect(Object.getPrototypeOf(decoded)).toBe(Object.prototype);
		expect(Object.hasOwn(decoded, "__proto__")).toBe(true);
		expect(decoded).toEqual(value);
	});

	test("rejects non-string and duplicate map keys", () => {
		expect(() => CBOR.unpack(bytesFromHex("a10102"))).toThrow("keys must be strings");
		expect(() => CBOR.unpack(bytesFromHex("a2616101616102"))).toThrow("Duplicate CBOR map key");
	});
});
