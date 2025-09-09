import { describe, expect, test } from "bun:test";
import { CBOR } from "../main";

describe("Date encoding and decoding", () => {
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

		expect((unpacked[0] as Date).getTime()).toBe(
			(testArray[0] as Date).getTime(),
		);
		expect((unpacked[2] as Date).getTime()).toBe(
			(testArray[2] as Date).getTime(),
		);
	});

	test("invalid dates", () => {
		expect(() => CBOR.pack(new Date("invalid"))).toThrow("Invalid Date object");
		expect(() => CBOR.pack(new Date(Number.NaN))).toThrow(
			"Invalid Date object",
		);
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
