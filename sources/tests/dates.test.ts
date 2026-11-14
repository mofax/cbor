import { describe, expect, test } from "bun:test";
import { encode } from "cbor2";
import { CBOR } from "../main";
import { bytesFromHex } from "./hex";

describe("Date encoding and decoding", () => {
	test("uses epoch seconds for tag 1", () => {
		const date = new Date(1000);
		const bytes = Uint8Array.of(0xc1, 0x01);
		expect(CBOR.pack(date)).toEqual(bytes);
		expect(CBOR.unpack(encode(date))).toEqual(date);
	});

	test("decodes fractional epoch seconds in shorter float encodings", () => {
		expect(CBOR.unpack(bytesFromHex("c1f93e00"))).toEqual(new Date(1500));
		expect(CBOR.unpack(bytesFromHex("c101"))).toEqual(new Date(1000));
		expect(CBOR.unpack(bytesFromHex("c1fabfc00000"))).toEqual(new Date(-1500));
	});

	test("preserves millisecond precision at large positive and negative timestamps", () => {
		for (const milliseconds of [8_639_999_999_999_999, -8_639_999_999_999_999, -1001, 1001]) {
			const date = new Date(milliseconds);
			expect(CBOR.unpack(CBOR.pack(date))).toEqual(date);
		}
	});

	test("decodes a date string tagged with a wide tag header", () => {
		const text = CBOR.pack("1970-01-01T00:00:01Z");
		const bytes = Uint8Array.of(0x82, 0xd8, 0x00, ...text, 0x02);
		expect(CBOR.unpack(bytes)).toEqual([new Date(1000), 2]);
	});

	test("rejects invalid date tag payloads", () => {
		expect(() => CBOR.unpack(bytesFromHex("c000"))).toThrow("requires a text string");
		expect(() => CBOR.unpack(bytesFromHex("c1f6"))).toThrow("requires a finite number");
	});

	test("pack - unpack", () => {
		const testDate = new Date("2023-06-15T09:30:45.123Z");
		const packed = CBOR.pack(testDate);
		const unpacked = CBOR.unpack(packed) as Date;

		expect(unpacked instanceof Date).toBe(true);
		expect(unpacked.getTime()).toBe(testDate.getTime());
	});

	test("dates in objects", () => {
		const testObj = {
			name: "test",
			created: new Date("2023-01-01T00:00:00.000Z"),
			updated: new Date("2023-12-31T23:59:59.999Z"),
		};

		const packed = CBOR.pack(testObj);
		const unpacked = CBOR.unpack(packed) as typeof testObj;

		expect(unpacked.name).toBe(testObj.name);
		expect(unpacked.created instanceof Date).toBe(true);
		expect(unpacked.updated instanceof Date).toBe(true);
		expect(unpacked.created.getTime()).toBe(testObj.created.getTime());
		expect(unpacked.updated.getTime()).toBe(testObj.updated.getTime());
	});

	test("dates in arrays", () => {
		const testArray = [
			new Date("2023-01-01T00:00:00.000Z"),
			"string value",
			new Date("2023-12-31T23:59:59.999Z"),
			42,
		];

		const packed = CBOR.pack(testArray);
		const unpacked = CBOR.unpack(packed) as any[];

		expect(Array.isArray(unpacked)).toBe(true);
		expect(unpacked.length).toBe(testArray.length);

		expect(unpacked[0] instanceof Date).toBe(true);
		expect(unpacked[1]).toBe("string value");
		expect(unpacked[2] instanceof Date).toBe(true);
		expect(unpacked[3]).toBe(42);

		expect((unpacked[0] as Date).getTime()).toBe((testArray[0] as Date).getTime());
		expect((unpacked[2] as Date).getTime()).toBe((testArray[2] as Date).getTime());
	});

	test("invalid dates", () => {
		expect(() => CBOR.pack(new Date("invalid"))).toThrow("Invalid Date object");
		expect(() => CBOR.pack(new Date(Number.NaN))).toThrow("Invalid Date object");
	});

	test("edge case dates", () => {
		// Unix epoch
		const epochDate = new Date(0);
		let packed = CBOR.pack(epochDate);
		let unpacked = CBOR.unpack(packed) as Date;
		expect(unpacked.getTime()).toBe(epochDate.getTime());

		// Year 2038 problem test date
		const y2038Date = new Date("2038-01-19T03:14:07.000Z");
		packed = CBOR.pack(y2038Date);
		unpacked = CBOR.unpack(packed) as Date;
		expect(unpacked.getTime()).toBe(y2038Date.getTime());

		// Future date
		const futureDate = new Date("2100-01-01T00:00:00.000Z");
		packed = CBOR.pack(futureDate);
		unpacked = CBOR.unpack(packed) as Date;
		expect(unpacked.getTime()).toBe(futureDate.getTime());
	});
});
