import { encode } from "cbor2";
import { CBOR } from "../main";
import { describe, expect, it } from "bun:test";
import { bytesFromHex } from "./hex";

type SimpleValue = { code: number };
const simpleCBOR = CBOR as unknown as {
	simple(code: number): SimpleValue;
	pack(
		value:
			| undefined
			| SimpleValue
			| { a: undefined }
			| { values: (undefined | null | SimpleValue)[] },
	): Uint8Array;
};

describe("booleans", () => {
	it("true", () => {
		const true1 = CBOR.pack(true);
		const true2 = encode(true);
		expect(true1).toEqual(true2);

		const decode1 = CBOR.unpack(true1);
		expect(decode1).toBe(true);
	});

	it("false", () => {
		const false1 = CBOR.pack(false);
		const false2 = encode(false);
		expect(false1).toEqual(false2);

		const decode1 = CBOR.unpack(false1);
		expect(decode1).toBe(false);
	});
});

describe("CBOR simple values", () => {
	it("encodes undefined as f7", () => {
		expect(simpleCBOR.pack(undefined)).toEqual(bytesFromHex("f7"));
	});

	it("decodes undefined and keeps it distinct from null", () => {
		expect(CBOR.unpack(bytesFromHex("f7"))).toBeUndefined();
		expect<unknown>(CBOR.unpack(bytesFromHex("82f7f6"))).toEqual([undefined, null]);
	});

	it("keeps an explicitly undefined map property", () => {
		const decoded = CBOR.unpack(bytesFromHex("a16161f7")) as object;
		expect(Object.hasOwn(decoded, "a")).toBe(true);
		expect(decoded).toEqual({ a: undefined });
		expect(simpleCBOR.pack({ a: undefined })).toEqual(bytesFromHex("a16161f7"));
	});

	it("continues to encode objects with a code property as maps", () => {
		const value = { code: 32 };
		const encoded = bytesFromHex("a164636f64651820");
		expect(CBOR.pack(value)).toEqual(encoded);
		expect(CBOR.unpack(encoded)).toEqual(value);
	});

	it.each([
		[0, "e0"],
		[19, "f3"],
		[32, "f820"],
		[255, "f8ff"],
	] as const)("encodes simple value %i with the correct width", (code, hex) => {
		expect(simpleCBOR.pack(simpleCBOR.simple(code))).toEqual(bytesFromHex(hex));
	});

	it.each([
		[0, "e0"],
		[19, "f3"],
		[32, "f820"],
		[255, "f8ff"],
	] as const)("decodes and preserves simple value %i", (code, hex) => {
		const encoded = bytesFromHex(hex);
		const decoded = CBOR.unpack(encoded);
		expect(decoded).toEqual({ code });
		expect(CBOR.pack(decoded)).toEqual(encoded);
	});

	it("encodes undefined and application simple values inside a map and array", () => {
		const encoded = bytesFromHex("a16676616c75657383f7f6f820");
		const value = { values: [undefined, null, simpleCBOR.simple(32)] };
		expect(simpleCBOR.pack(value)).toEqual(encoded);
		expect<unknown>(CBOR.unpack(encoded)).toEqual({ values: [undefined, null, { code: 32 }] });
	});

	it.each(["f8", "f800", "f814", "f817", "f81f", "fc", "fd", "fe"])(
		"rejects malformed simple-value input %s",
		(hex) => {
			expect(() => CBOR.unpack(bytesFromHex(hex))).toThrow();
		},
	);

	it.each([-1, 1.5, 24, 31, 256].map((code) => [code]))(
		"rejects invalid simple-value code %s",
		(code) => {
			expect(simpleCBOR.simple).toBeFunction();
			expect(() => simpleCBOR.pack(simpleCBOR.simple(code))).toThrow();
		},
	);
});
