import type { Decoded } from "../common/codec.js";
import { Major } from "../common/common.js";
import { encodeLength } from "../common/length.js";
import { createDataView } from "../common/parser.js";
import { encodeFloat64 } from "./float64.js";

export function encodeNumber(value: number): Uint8Array {
	if (!Number.isFinite(value)) {
		throw new Error("NaN/Infinity cannot be encoded as a number");
	}
	if (!Number.isInteger(value) || Object.is(value, -0)) {
		return encodeFloat64(value);
	}
	if (!Number.isSafeInteger(value)) {
		throw new Error(`Integer ${value} exceeds JavaScript's safe integer range`);
	}

	return value < 0 ? encodeLength(-1 - value, Major.Negative) : encodeLength(value, Major.Unsigned);
}

export function decodeFloat(data: Uint8Array, offset: number, additionalInfo: number): Decoded<number> {
	switch (additionalInfo) {
		case 25: {
			const bits = createDataView(data, offset + 1, 2).getUint16(0);
			return { value: decodeFloat16(bits), nextOffset: offset + 3 };
		}
		case 26: {
			const value = createDataView(data, offset + 1, 4).getFloat32(0);
			return { value, nextOffset: offset + 5 };
		}
		case 27: {
			const value = createDataView(data, offset + 1, 8).getFloat64(0);
			return { value, nextOffset: offset + 9 };
		}
		default:
			throw new Error(`Unsupported simple value with additional info: ${additionalInfo}`);
	}
}

function decodeFloat16(bits: number): number {
	const sign = bits & 0x8000 ? -1 : 1;
	const exponent = (bits >> 10) & 0x1f;
	const fraction = bits & 0x3ff;

	if (exponent === 0) {
		return sign * fraction * 2 ** -24;
	}
	if (exponent === 31) {
		return fraction === 0 ? sign * Infinity : NaN;
	}
	return sign * (1 + fraction / 1024) * 2 ** (exponent - 15);
}
