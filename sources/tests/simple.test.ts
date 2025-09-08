import { encode } from "cbor2";
import { CBOR } from "../main";
import { describe, expect, it } from "bun:test";

describe("booleans", () => {
	it("true", () => {
		const true1 = CBOR.pack(true);
		const true2 = encode(true);
		expect(true1).toEqual(true2);

		const decode1 = CBOR.unpack(true1);
		expect(decode1).toBe(true);
	});

	it("true", () => {
		const false1 = CBOR.pack(false);
		const false2 = encode(false);
		expect(false1).toEqual(false2);

		const decode1 = CBOR.unpack(false1);
		expect(decode1).toBe(false);
	});
});
