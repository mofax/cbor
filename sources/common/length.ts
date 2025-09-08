import { Major } from "./common";
import { getUint64, setUint64 } from "./bytes";

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
export function encodeLength(length: number, majorType: Major): Uint8Array {
	if (length <= DIRECT_ENCODING_MAX) {
		return new Uint8Array([majorType | length]);
	} else if (length <= UINT8_MAX) {
		return new Uint8Array([majorType | UINT8_ADDITIONAL_DATA, length]);
	} else if (length <= UINT16_MAX) {
		const out = new Uint8Array(1 + UINT16_SIZE);
		out[0] = majorType | UINT16_ADDITIONAL_DATA;
		const view = new DataView(out.buffer, 1);
		view.setUint16(0, length, false); // big-endian
		return out;
	} else if (length <= UINT32_MAX) {
		const out = new Uint8Array(1 + UINT32_SIZE);
		out[0] = majorType | UINT32_ADDITIONAL_DATA;
		const view = new DataView(out.buffer, 1);
		view.setUint32(0, length, false); // big-endian
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
	if (additionalInfo <= DIRECT_ENCODING_MAX) {
		return { length: additionalInfo, headerSize: 1 };
	} else if (additionalInfo === UINT8_ADDITIONAL_DATA) {
		if (offset + 2 > data.length) {
			throw new Error(`Insufficient data for uint8 ${context}`);
		}
		return { length: data[offset + 1], headerSize: 2 };
	} else if (additionalInfo === UINT16_ADDITIONAL_DATA) {
		if (offset + 3 > data.length) {
			throw new Error(`Insufficient data for uint16 ${context}`);
		}
		const view = new DataView(data.buffer, data.byteOffset + offset + 1, 2);
		return { length: view.getUint16(0, false), headerSize: 3 };
	} else if (additionalInfo === UINT32_ADDITIONAL_DATA) {
		if (offset + 5 > data.length) {
			throw new Error(`Insufficient data for uint32 ${context}`);
		}
		const view = new DataView(data.buffer, data.byteOffset + offset + 1, 4);
		return { length: view.getUint32(0, false), headerSize: 5 };
	} else if (additionalInfo === UINT64_ADDITIONAL_DATA) {
		if (offset + 9 > data.length) {
			throw new Error(`Insufficient data for uint64 ${context}`);
		}
		const view = new DataView(data.buffer, data.byteOffset + offset + 1, 8);
		const bigintLength = getUint64(view, 0);

		// Check if the length fits in JavaScript's safe integer range
		if (bigintLength <= BigInt(Number.MAX_SAFE_INTEGER)) {
			return { length: Number(bigintLength), headerSize: 9 };
		} else {
			throw new Error(
				`${context} ${bigintLength} exceeds JavaScript's safe integer range`,
			);
		}
	} else {
		throw new Error(
			`Invalid additional info for ${context}: ${additionalInfo}`,
		);
	}
}

/**
 * Calculates how many bytes an encoded length/value will consume
 */
export function calculateEncodedSize(additionalInfo: number): number {
	if (additionalInfo <= DIRECT_ENCODING_MAX) {
		return 1;
	} else if (additionalInfo === UINT8_ADDITIONAL_DATA) {
		return 2;
	} else if (additionalInfo === UINT16_ADDITIONAL_DATA) {
		return 3;
	} else if (additionalInfo === UINT32_ADDITIONAL_DATA) {
		return 5;
	} else if (additionalInfo === UINT64_ADDITIONAL_DATA) {
		return 9;
	} else {
		throw new Error(`Invalid additional info: ${additionalInfo}`);
	}
}
