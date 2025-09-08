import { describe, expect, test } from "bun:test";
import { encode } from "cbor2";
import { CBOR } from "../main";

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
