import { Major } from "./common/common";
import { parseCBORHeader } from "./common/parser";
import {
	type CBORArray,
	type CBORObject,
	type CBORValue,
	decodeCBORValue,
	encodeCBORValue,
} from "./common/codec";
import {
	decodeArray,
	decodeMap,
	encodeArray,
	encodeMap,
} from "./types/complex";

const CBOR = {} as {
	pack: (value: CBORValue | CBORObject | CBORArray) => Uint8Array;
	unpack: (data: Uint8Array) => CBORValue | CBORObject | CBORArray;
};

CBOR.pack = (value: CBORValue | CBORObject | CBORArray): Uint8Array => {
	if (Array.isArray(value)) {
		return encodeArray(value);
	} else if (
		typeof value === "object" && value !== null && !Array.isArray(value)
	) {
		return encodeMap(value);
	} else {
		return encodeCBORValue(value);
	}
};

CBOR.unpack = (data: Uint8Array): CBORValue | CBORObject | CBORArray => {
	if (data.length === 0) {
		throw new Error("Cannot unpack empty data");
	}

	const { majorType } = parseCBORHeader(data, 0);

	if (majorType === Major.Array) {
		return decodeArray(data);
	} else if (majorType === Major.Map) {
		return decodeMap(data);
	} else {
		const { value } = decodeCBORValue(data, 0);
		return value;
	}
};

export { CBOR };
