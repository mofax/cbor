import { Major } from "./common/common";
import { parseCBORHeader } from "./common/parser";
import {
	type CBORArray,
	type CBORDate,
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
import { isDateValue } from "./types/date";

type CBORIO = CBORValue | CBORObject | CBORArray | CBORDate;
const CBOR = {} as {
	pack: (value: CBORIO) => Uint8Array;
	unpack: (data: Uint8Array) => CBORIO;
};

CBOR.pack = (value: CBORIO) => {
	if (Array.isArray(value)) {
		return encodeArray(value);
	} else if (value instanceof Date) {
		return encodeCBORValue(value);
	} else if (
		typeof value === "object" && value !== null && !Array.isArray(value)
	) {
		return encodeMap(value);
	} else {
		return encodeCBORValue(value);
	}
};

CBOR.unpack = (data: Uint8Array): CBORIO => {
	if (data.length === 0) {
		throw new Error("Cannot unpack empty data");
	}

	const { majorType } = parseCBORHeader(data, 0);

	if (majorType === Major.Array) {
		return decodeArray(data);
	} else if (majorType === Major.Map) {
		return decodeMap(data);
	} else if (majorType === Major.Tag && isDateValue(data, 0)) {
		const { value } = decodeCBORValue(data, 0);
		return value;
	} else {
		const { value } = decodeCBORValue(data, 0);
		return value;
	}
};

export { CBOR };
