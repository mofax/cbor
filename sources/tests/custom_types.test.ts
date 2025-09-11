import { CBOR } from "../main";
import { describe, expect, test } from "bun:test";
import type { CBORTaggable } from "../common/codec";

describe("Custom Classes", () => {
	class Address implements CBORTaggable {
		__is_cbor_taggable__ = true as const;
		__custom_tag__ = 300 as const;

		constructor(public street: string, public city: string) {}

		toCBOR() {
			return {
				type: "array",
				value: [this.street, this.city],
			} as const;
		}

		fromCBOR(data: unknown): Address {
			if (
				Array.isArray(data) &&
				data.length === 2 &&
				typeof data[0] === "string" &&
				typeof data[1] === "string"
			) {
				return new Address(data[0], data[1]);
			}
			throw new Error("Invalid CBOR data for Address");
		}
	}

	test("custom class", () => {
		const pack1 = CBOR.pack(new Address("123 Main St", "Anytown"));
		const unpack1 = CBOR.unpack(pack1);
		expect(unpack1).toBeInstanceOf(Address);
		if (unpack1 instanceof Address) {
			expect(unpack1.street).toBe("123 Main St");
			expect(unpack1.city).toBe("Anytown");
		}
	});

	test("class in array", () => {
		const pack1 = CBOR.pack([new Address("123 Main St", "Anytown")]);
		const unpack1 = CBOR.unpack(pack1);
		expect(unpack1).toBeInstanceOf(Array);
		if (Array.isArray(unpack1)) {
			expect(unpack1[0]).toBeInstanceOf(Address);
			if (unpack1[0] instanceof Address) {
				expect(unpack1[0].street).toBe("123 Main St");
				expect(unpack1[0].city).toBe("Anytown");
			}
		}
	});

	test("class in record", () => {
		const pack1 = CBOR.pack({ address: new Address("123 Main St", "Anytown") });
		const unpack1 = CBOR.unpack(pack1);
		expect(unpack1).toBeInstanceOf(Object);
		if (typeof unpack1 === "object" && unpack1 !== null) {
			expect(unpack1.address).toBeInstanceOf(Address);
			if (unpack1.address instanceof Address) {
				expect(unpack1.address.street).toBe("123 Main St");
				expect(unpack1.address.city).toBe("Anytown");
			}
		}
	});
});
