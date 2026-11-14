import { getUint64, setUint64 } from "./bytes.js";
import { createDataView } from "./parser.js";

// CBOR additional information values
export const DIRECT_ENCODING_MAX = 23;
export const UINT8_ADDITIONAL_DATA = 24;
export const UINT16_ADDITIONAL_DATA = 25;
export const UINT32_ADDITIONAL_DATA = 26;
export const UINT64_ADDITIONAL_DATA = 27;

// Value thresholds for different encoding sizes
export const UINT8_MAX = 255;
export const UINT16_MAX = 65535;
export const UINT32_MAX = 4294967295;

// Encoding sizes
export const UINT16_SIZE = 2;
export const UINT32_SIZE = 4;
export const UINT64_SIZE = 8;

/**
 * Encodes a length value with the specified major type
 */
export function encodeLength(length: number | bigint, majorType: number): Uint8Array {
	if (length <= DIRECT_ENCODING_MAX) {
		return Uint8Array.of(majorType | Number(length));
	} else if (length <= UINT8_MAX) {
		return Uint8Array.of(majorType | UINT8_ADDITIONAL_DATA, Number(length));
	} else if (length <= UINT16_MAX) {
		const out = new Uint8Array(1 + UINT16_SIZE);
		out[0] = majorType | UINT16_ADDITIONAL_DATA;
		const view = new DataView(out.buffer, 1);
		view.setUint16(0, Number(length));
		return out;
	} else if (length <= UINT32_MAX) {
		const out = new Uint8Array(1 + UINT32_SIZE);
		out[0] = majorType | UINT32_ADDITIONAL_DATA;
		const view = new DataView(out.buffer, 1);
		view.setUint32(0, Number(length));
		return out;
	} else {
		const out = new Uint8Array(1 + UINT64_SIZE);
		out[0] = majorType | UINT64_ADDITIONAL_DATA;
		const view = new DataView(out.buffer, 1);
		setUint64(view, 0, BigInt(length));
		return out;
	}
}

/**
 * Decodes a length value from CBOR data
 */
export function decodeLength(
	data: Uint8Array,
	offset: number,
	additionalInfo: number,
	context: string = "length",
): { length: number; headerSize: number } {
	const { argument, headerSize } = decodeArgument(data, offset, additionalInfo, context);
	if (typeof argument === "bigint") {
		throw new Error(`${context} ${argument} exceeds JavaScript's safe integer range`);
	}
	return { length: argument, headerSize };
}

export function decodeArgument(
	data: Uint8Array,
	offset: number,
	additionalInfo: number,
	context = "CBOR argument",
): { argument: number | bigint; headerSize: number } {
	if (additionalInfo <= DIRECT_ENCODING_MAX) {
		return { argument: additionalInfo, headerSize: 1 };
	}
	const body = offset + 1;
	switch (additionalInfo) {
		case UINT8_ADDITIONAL_DATA:
			return { argument: createDataView(data, body, 1).getUint8(0), headerSize: 2 };
		case UINT16_ADDITIONAL_DATA:
			return { argument: createDataView(data, body, UINT16_SIZE).getUint16(0), headerSize: 3 };
		case UINT32_ADDITIONAL_DATA:
			return { argument: createDataView(data, body, UINT32_SIZE).getUint32(0), headerSize: 5 };
		case UINT64_ADDITIONAL_DATA: {
			const value = getUint64(createDataView(data, body, UINT64_SIZE), 0);
			const argument = value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value;
			return { argument, headerSize: 1 + UINT64_SIZE };
		}
		default:
			throw new Error(`Invalid additional info for ${context}: ${additionalInfo}`);
	}
}
