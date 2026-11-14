import { Major } from "./common.js";
import { decodeLength } from "./length.js";
import { parseCBORHeader } from "./parser.js";
import { encodeBytes } from "../types/bytes.js";
import { decodeArray, decodeMap, encodeArray, encodeMap } from "../types/complex.js";
import { decodeDate, encodeDate } from "../types/date.js";
import { decodeFloat, encodeNumber } from "../types/number.js";
import { encodeBoolean, encodeNull } from "../types/simple.js";
import { encodeString } from "../types/string.js";

export type CBORObject = { [key: string]: CBORIO };
export type CBORArray = CBORIO[];
export type CBORIO = string | number | boolean | null | Date | Uint8Array | CBORObject | CBORArray;

export interface Decoded<T> {
	value: T;
	nextOffset: number;
}

const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export function encodeCBORValue(value: unknown): Uint8Array {
	if (typeof value === "string") {
		return encodeString(value);
	} else if (typeof value === "number") {
		return encodeNumber(value);
	} else if (typeof value === "boolean") {
		return encodeBoolean(value);
	} else if (value === null) {
		return encodeNull();
	} else if (value instanceof Uint8Array) {
		return encodeBytes(value);
	} else if (value instanceof Date) {
		return encodeDate(value);
	} else if (Array.isArray(value)) {
		return encodeArray(value, encodeCBORValue);
	} else if (typeof value === "object") {
		const prototype = Object.getPrototypeOf(value);
		if (prototype === Object.prototype || prototype === null) {
			return encodeMap(value, encodeCBORValue);
		}
		throw new TypeError("CBOR maps require plain objects with string keys");
	}
	throw new TypeError(`Unsupported CBOR type: ${typeof value}`);
}

export function decodeCBORValue(data: Uint8Array): Decoded<CBORIO> {
	function readValue(offset: number): Decoded<CBORIO> {
		const { majorType, additionalInfo } = parseCBORHeader(data, offset);

		if (majorType === Major.Simple) {
			switch (additionalInfo) {
				case 20:
				case 21:
					return { value: additionalInfo === 21, nextOffset: offset + 1 };
				case 22:
					return { value: null, nextOffset: offset + 1 };
				default:
					return decodeFloat(data, offset, additionalInfo);
			}
		}

		const { length: argument, headerSize } = decodeLength(data, offset, additionalInfo, "CBOR argument");
		const bodyOffset = offset + headerSize;
		switch (majorType) {
			case Major.Unsigned:
				return { value: argument, nextOffset: bodyOffset };
			case Major.Negative: {
				const value = -1 - argument;
				if (!Number.isSafeInteger(value)) {
					throw new Error(`Integer ${value} exceeds JavaScript's safe integer range`);
				}
				return { value, nextOffset: bodyOffset };
			}
			case Major.Text:
			case Major.Bytes: {
				if (argument > data.length - bodyOffset) {
					throw new Error(`Insufficient data for string content at offset ${bodyOffset}`);
				}
				const nextOffset = bodyOffset + argument;
				const payload = data.subarray(bodyOffset, nextOffset);
				const value = majorType === Major.Text ? utf8Decoder.decode(payload) : new Uint8Array(payload);
				return { value, nextOffset };
			}
			case Major.Array:
				return decodeArray(argument, bodyOffset, readValue);
			case Major.Map:
				return decodeMap(argument, bodyOffset, readValue);
			case Major.Tag: {
				if (argument !== 0 && argument !== 1) {
					throw new Error(`Unsupported tag: ${argument}`);
				}
				const { value, nextOffset } = readValue(bodyOffset);
				return { value: decodeDate(argument, value), nextOffset };
			}
			default:
				throw new Error(`Unsupported major type: ${majorType >> 5}`);
		}
	}

	return readValue(0);
}
