import { describe, expect, test } from "bun:test";
import { encode } from "cbor2";
import { CBOR } from "../main";

describe("Positive numbers", () => {
	test("0", () => {
		const num1 = CBOR.pack(0);
		const num2 = encode(0);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(0);
	});

	test("1", () => {
		const num1 = CBOR.pack(1);
		const num2 = encode(1);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(1);
	});

	test("10", () => {
		const num1 = CBOR.pack(10);
		const num2 = encode(10);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(10);
	});

	test("23", () => {
		const num1 = CBOR.pack(23);
		const num2 = encode(23);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(23);
	});

	test("24", () => {
		const num1 = CBOR.pack(24);
		const num2 = encode(24);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(24);
	});

	test("25", () => {
		const num1 = CBOR.pack(25);
		const num2 = encode(25);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(25);
	});

	test("100", () => {
		const num1 = CBOR.pack(100);
		const num2 = encode(100);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(100);
	});

	test("1000", () => {
		const num1 = CBOR.pack(1000);
		const num2 = encode(1000);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(1000);
	});

	test("1000000", () => {
		const num1 = CBOR.pack(1000000);
		const num2 = encode(1000000);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(1000000);
	});

	test("4294967295", () => {
		const num1 = CBOR.pack(4294967295);
		const num2 = encode(4294967295);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(4294967295);
	});

	test("9007199254740991", () => {
		const num1 = CBOR.pack(9007199254740991);
		const num2 = encode(9007199254740991);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(9007199254740991);
	});
});

describe("Negative numbers", () => {
	test("-1", () => {
		const num1 = CBOR.pack(-1);
		const num2 = encode(-1);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(-1);
	});

	test("-10", () => {
		const num1 = CBOR.pack(-10);
		const num2 = encode(-10);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(-10);
	});

	test("-23", () => {
		const num1 = CBOR.pack(-23);
		const num2 = encode(-23);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(-23);
	});

	test("-24", () => {
		const num1 = CBOR.pack(-24);
		const num2 = encode(-24);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(-24);
	});

	test("-25", () => {
		const num1 = CBOR.pack(-25);
		const num2 = encode(-25);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(-25);
	});

	test("-100", () => {
		const num1 = CBOR.pack(-100);
		const num2 = encode(-100);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(-100);
	});

	test("-1000", () => {
		const num1 = CBOR.pack(-1000);
		const num2 = encode(-1000);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(-1000);
	});
	test("-1000000", () => {
		const num1 = CBOR.pack(-1000000);
		const num2 = encode(-1000000);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(-1000000);
	});

	test("-4294967296", () => {
		const num1 = CBOR.pack(-4294967296);
		const num2 = encode(-4294967296);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(-4294967296);
	});

	test("-9007199254740991", () => {
		const num1 = CBOR.pack(-9007199254740991);
		const num2 = encode(-9007199254740991);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(-9007199254740991);
	});

	test("-9007199254740992 (out of safe range)", () => {
		expect(() => {
			CBOR.pack(-9007199254740992);
		}).toThrowError(
			"Integer -9007199254740992 exceeds JavaScript's safe integer range",
		);
	});

	test("9007199254740992 (out of safe range)", () => {
		expect(() => {
			CBOR.pack(9007199254740992);
		}).toThrowError(
			"Integer 9007199254740992 exceeds JavaScript's safe integer range",
		);
	});
});

// Floating point numbers
describe("Floating point numbers", () => {
	test("0.5", () => {
		const num1 = CBOR.pack(0.5);
		// const num2 = encode(0.5);  TODO - we use float64 by default; maybe we should use half precision ?
		expect(num1).toEqual(
			new Uint8Array([0xfb, 0x3f, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
		);
		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(0.5);
	});

	test("1.1", () => {
		const num1 = CBOR.pack(1.1);
		const num2 = encode(1.1);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(1.1);
	});

	test("-1.1", () => {
		const num1 = CBOR.pack(-1.1);
		const num2 = encode(-1.1);
		expect(num1).toEqual(num2);

		const decode1 = CBOR.unpack(num1);
		expect(decode1).toBe(-1.1);
	});

	test("1.7976931348623157e+308 (Float64 max)", () => {
		expect(() => {
			CBOR.pack(1.7976931348623157e+308);
		}).toThrowError(
			"Integer 1.7976931348623157e+308 exceeds JavaScript's safe integer range",
		);
	});

	test("NaN", () => {
		expect(() => {
			CBOR.pack(NaN);
		}).toThrowError("NaN/Infinity cannot be encoded as a number");
	});

	test("Infinity", () => {
		expect(() => {
			CBOR.pack(Infinity);
		}).toThrowError("NaN/Infinity cannot be encoded as a number");
	});

	test("-Infinity", () => {
		expect(() => {
			CBOR.pack(-Infinity);
		}).toThrowError("NaN/Infinity cannot be encoded as a number");
	});
});
