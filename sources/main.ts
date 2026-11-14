import { type CBORIO, decodeCBORValue, encodeCBORValue } from "./common/codec.js";

export type { CBORArray, CBORIO, CBORObject } from "./common/codec.js";

export const CBOR = {
	pack(value: CBORIO): Uint8Array {
		return encodeCBORValue(value);
	},

	unpack(data: Uint8Array): CBORIO {
		if (data.length === 0) {
			throw new Error("Cannot unpack empty data");
		}

		const { value, nextOffset } = decodeCBORValue(data);
		if (nextOffset !== data.length) {
			throw new Error(`Unexpected trailing data at offset ${nextOffset}`);
		}

		return value;
	},
};
