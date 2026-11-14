import { describe, expect, test } from "bun:test";
import { encode } from "cbor2";
import { CBOR } from "../main";
import { bytesFromHex } from "./hex";

const packBigInt = CBOR.pack as (value: bigint | { value: [bigint, number] }) => Uint8Array;
const deterministicPack = CBOR.pack as (
	value: number,
	options: { deterministic: true },
) => Uint8Array;

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

	test("requires bigint input for an unsafe negative integer", () => {
		expect(() => {
			CBOR.pack(-9007199254740992);
		}).toThrowError("Integer -9007199254740992 exceeds JavaScript's safe integer range");
	});

	test("requires bigint input for an unsafe positive integer", () => {
		expect(() => {
			CBOR.pack(9007199254740992);
		}).toThrowError("Integer 9007199254740992 exceeds JavaScript's safe integer range");
	});
});

// Floating point numbers
describe("Floating point numbers", () => {
	test("decodes an existing float64 half and round-trips its value", () => {
		expect(CBOR.unpack(bytesFromHex("fb3fe0000000000000"))).toBe(0.5);
		expect(CBOR.unpack(CBOR.pack(0.5))).toBe(0.5);
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

	test("decodes the largest finite float64", () => {
		expect(CBOR.unpack(bytesFromHex("fb7fefffffffffffff"))).toBe(Number.MAX_VALUE);
	});

	test.each([
		["NaN", NaN, "f97e00"],
		["positive infinity", Infinity, "f97c00"],
		["negative infinity", -Infinity, "f9fc00"],
	] as const)("decodes and round-trips %s", (_name, value, hex) => {
		expect(Object.is(CBOR.unpack(bytesFromHex(hex)), value)).toBe(true);
		expect(Object.is(CBOR.unpack(CBOR.pack(value)), value)).toBe(true);
	});
});

describe("BigInt", () => {
	const largeIntegers: readonly (readonly [bigint, string])[] = [
		[2n ** 53n, "1b0020000000000000"],
		[-(2n ** 53n), "3b001fffffffffffff"],
		[2n ** 53n + 1n, "1b0020000000000001"],
		[-(2n ** 53n) - 1n, "3b0020000000000000"],
		[2n ** 64n - 1n, "1bffffffffffffffff"],
		[-(2n ** 64n), "3bffffffffffffffff"],
		[2n ** 64n, "c249010000000000000000"],
		[-(2n ** 64n) - 1n, "c349010000000000000000"],
		[2n ** 80n + 1n, "c24b0100000000000000000001"],
	];
	const integerCases = largeIntegers.map(([value, hex]) => [String(value), value, hex] as const);

	test.each(integerCases)("encodes %s as an exact integer", (_name, value, hex) => {
		expect(packBigInt(value)).toEqual(bytesFromHex(hex));
	});

	test.each(integerCases)("decodes %s as a bigint without rounding", (_name, value, hex) => {
		expect<unknown>(CBOR.unpack(bytesFromHex(hex))).toBe(value);
	});

	test("encodes small bigint inputs using basic integers", () => {
		expect(packBigInt(1n)).toEqual(bytesFromHex("01"));
		expect(packBigInt(-1n)).toEqual(bytesFromHex("20"));
		expect(CBOR.unpack(bytesFromHex("01"))).toBe(1);
		expect(CBOR.unpack(bytesFromHex("20"))).toBe(-1);
	});

	test("accepts bignum tags with empty magnitudes or leading zero bytes", () => {
		expect<unknown>(CBOR.unpack(bytesFromHex("84c240c340c2420001c3420001"))).toEqual([
			0n,
			-1n,
			1n,
			-2n,
		]);
	});

	test("preserves large integers and their siblings in nested data", () => {
		const original = { value: [2n ** 64n, 5] } satisfies { value: [bigint, number] };
		const encoded = bytesFromHex("a16576616c756582c24901000000000000000005");
		expect(packBigInt(original)).toEqual(encoded);
		expect<unknown>(CBOR.unpack(encoded)).toEqual(original);
	});

	test.each([
		["positive bignum with an integer payload", "c201"],
		["negative bignum with a text payload", "c36161"],
		["truncated bignum magnitude", "c24201"],
		["truncated basic integer", "1bffffffffffffff"],
	])("rejects a %s", (_name, hex) => {
		expect(() => CBOR.unpack(bytesFromHex(hex))).toThrow();
	});
});

describe("Deterministic floating-point encoding", () => {
	test.each([
		["half precision", 0.5, "f93800"],
		["half-precision subnormal", 2 ** -24, "f90001"],
		["single precision", 1 + 2 ** -23, "fa3f800001"],
		["double precision", 1.1, "fb3ff199999999999a"],
		["negative zero", -0, "f98000"],
		["NaN", NaN, "f97e00"],
		["positive infinity", Infinity, "f97c00"],
		["negative infinity", -Infinity, "f9fc00"],
	] as const)("uses the preferred bytes for %s", (_name, value, hex) => {
		const encoded = deterministicPack(value, { deterministic: true });
		expect(encoded).toEqual(bytesFromHex(hex));
		expect(Object.is(CBOR.unpack(encoded), value)).toBe(true);
	});
});
