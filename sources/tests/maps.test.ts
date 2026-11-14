import { describe, expect, test } from "bun:test";
import { encode } from "cbor2";
import { CBOR, type CBORIO } from "../main";
import { bytesFromHex } from "./hex";

type TestMap = Map<CBORIO, CBORIO>;
const packMap = CBOR.pack as (value: TestMap | { items: [TestMap, number] }) => Uint8Array;
const deterministicPack = CBOR.pack as (
	value: CBORIO | TestMap,
	options: { deterministic: true },
) => Uint8Array;

describe("Struct encoding", () => {
	test("simple struct", () => {
		const original = { a: 1, b: 2 };
		const pack1 = CBOR.pack(original);
		const pack2 = encode(original);

		expect(pack1).toEqual(pack2);
		const unpack1 = CBOR.unpack(pack1);
		expect(unpack1).toEqual(original);
	});

	test("nested struct", () => {
		const original = { a: 1, b: { c: 3, d: 4 } };
		const pack1 = CBOR.pack(original);
		const pack2 = encode(original);

		expect(pack1).toEqual(pack2);
		const unpack1 = CBOR.unpack(pack1);
		expect(unpack1).toEqual(original);
	});

	test("deeply nested struct", () => {
		const original = { a: 1, b: { c: 3, d: { e: 5, f: 6 } } };
		const pack1 = CBOR.pack(original);
		const pack2 = encode(original);

		expect(pack1).toEqual(pack2);
		const unpack1 = CBOR.unpack(pack1);
		expect(unpack1).toEqual(original);
	});

	test("array of structs", () => {
		const original = [{ a: 1 }, { a: 2 }];
		const pack1 = CBOR.pack(original);
		const pack2 = encode(original);

		expect(pack1).toEqual(pack2);
		const unpack1 = CBOR.unpack(pack1);
		expect(unpack1).toEqual(original);
	});

	test("map with array values", () => {
		const original = { a: [1, 2, 3], b: [4, 5, 6] };
		const pack1 = CBOR.pack(original);
		const pack2 = encode(original);

		expect(pack1).toEqual(pack2);
		const unpack1 = CBOR.unpack(pack1);
		expect(unpack1).toEqual(original);
	});

	test("map with mixed values", () => {
		const original = { a: 1, b: [2, 3], c: { d: 4 } };
		const pack1 = CBOR.pack(original);
		const pack2 = encode(original);

		expect(pack1).toEqual(pack2);
		const unpack1 = CBOR.unpack(pack1);
		expect(unpack1).toEqual(original);
	});

	test("map with nested arrays", () => {
		const original = { a: [1, 2, 3], b: [4, 5, [6, 7]] };
		const pack1 = CBOR.pack(original);
		const pack2 = encode(original);

		expect(pack1).toEqual(pack2);
		const unpack1 = CBOR.unpack(pack1);
		expect(unpack1).toEqual(original);
	});
});

describe("CBOR maps with arbitrary keys", () => {
	test("encodes an empty Map and a Map with only string keys", () => {
		expect(packMap(new Map())).toEqual(bytesFromHex("a0"));
		expect(packMap(new Map([["a", 1]]))).toEqual(bytesFromHex("a1616101"));
	});

	test("continues to decode text-keyed maps as plain objects", () => {
		expect(CBOR.unpack(bytesFromHex("a1616101"))).toEqual({ a: 1 });
	});

	const entries: [CBORIO, CBORIO][] = [
		[1, 2],
		["1", 3],
		[false, null],
	];
	const mixedKeys = bytesFromHex("a30102613103f4f6");

	test("encodes integer and text keys with the same spelling", () => {
		expect(packMap(new Map(entries))).toEqual(mixedKeys);
	});

	test("decodes integer and text keys with the same spelling as distinct keys", () => {
		const decoded: unknown = CBOR.unpack(mixedKeys);
		expect(decoded).toBeInstanceOf(Map);
		expect(decoded).toEqual(new Map(entries));
	});

	test("round-trips byte strings and arrays as keys inside nested maps", () => {
		const original: { items: [TestMap, number] } = {
			items: [
				new Map<CBORIO, CBORIO>([
					[Uint8Array.of(0xff), 3],
					[[1, 2], "a"],
				]),
				2,
			],
		};
		const encoded = bytesFromHex("a1656974656d7382a241ff03820102616102");
		expect(packMap(original)).toEqual(encoded);

		const decoded = CBOR.unpack(encoded) as { items: [TestMap, number] };
		expect(decoded.items[0]).toBeInstanceOf(Map);
		expect(Array.from(decoded.items[0].entries())).toEqual(Array.from(original.items[0].entries()));
		expect(decoded.items[1]).toBe(2);
	});

	test.each([
		["integers encoded with different widths", "a20100180101"],
		["equal byte strings", "a2410000410001"],
		["equal arrays", "a2810100810101"],
	])("rejects duplicate keys made of %s", (_name, hex) => {
		expect(() => CBOR.unpack(bytesFromHex(hex))).toThrow(/duplicate/i);
	});
});

describe("Deterministic map encoding", () => {
	test("sorts text keys by their encoded bytes at every depth", () => {
		const left = { aa: { e: 3, d: 2 }, z: 1 };
		const right = { z: 1, aa: { d: 2, e: 3 } };
		const expected = bytesFromHex("a2617a01626161a2616402616503");
		expect(deterministicPack(left, { deterministic: true })).toEqual(expected);
		expect(deterministicPack(right, { deterministic: true })).toEqual(expected);
	});

	test("uses core bytewise order for mixed keys and preferred float widths for values", () => {
		const entries: [CBORIO, CBORIO][] = [
			[false, 3],
			[-1, 2],
			[100, 0.5],
			[10, 1],
		];
		const expected = bytesFromHex("a40a011864f938002002f403");
		expect(deterministicPack(new Map(entries), { deterministic: true })).toEqual(expected);
		expect(deterministicPack(new Map(entries.reverse()), { deterministic: true })).toEqual(
			expected,
		);
	});
});
