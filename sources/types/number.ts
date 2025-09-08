import { Major } from "../common/common";
import { decodeFloat64, encodeFloat64 } from "./float64";
import { getUint64, setUint64 } from "../common/bytes";
import { createDataView, parseCBORHeader } from "../common/parser";
import {
	DIRECT_ENCODING_MAX,
	UINT16_ADDITIONAL_DATA,
	UINT16_MAX,
	UINT16_SIZE,
	UINT32_ADDITIONAL_DATA,
	UINT32_MAX,
	UINT32_SIZE,
	UINT64_ADDITIONAL_DATA,
	UINT64_SIZE,
	UINT8_ADDITIONAL_DATA,
	UINT8_MAX,
} from "../common/length";

export function encodeNumber(n: number): Uint8Array {
	if (!Number.isFinite(n)) {
		throw new Error("NaN/Infinity cannot be encoded as a number");
	}
	if (Number.isInteger(n)) {
		if (!Number.isSafeInteger(n)) {
			throw new Error(`Integer ${n} exceeds JavaScript's safe integer range`);
		}
		if (n >= 0) {
			// Positive integer - Major type 0
			return encodeUnsignedInteger(n);
		} else {
			// Negative integer - Major type 1
			return encodeNegativeInteger(n);
		}
	} else {
		return encodeFloat64(n);
	}
}

export function decodeNumber(data: Uint8Array): number {
	const { majorType, additionalInfo } = parseCBORHeader(data, 0);

	switch (majorType) {
		case Major.Unsigned:
			return decodeUnsignedInteger(data, 0, additionalInfo);
		case Major.Negative:
			return decodeNegativeInteger(data, 0, additionalInfo);
		case Major.Simple:
			if (additionalInfo === 27) {
				// Float64
				return decodeFloat64(data, 0);
			}
			throw new Error(
				`Unsupported simple value with additional info: ${additionalInfo}`,
			);
		default:
			throw new Error(`Invalid major type for number: ${majorType >> 5}`);
	}
}

function encodeUnsignedInteger(n: number): Uint8Array {
	if (n <= DIRECT_ENCODING_MAX) {
		return new Uint8Array([Major.Unsigned | n]);
	} else if (n <= UINT8_MAX) {
		// 1-byte
		return new Uint8Array([Major.Unsigned | UINT8_ADDITIONAL_DATA, n]);
	} else if (n <= UINT16_MAX) {
		// 2-byte
		const out = new Uint8Array(1 + UINT16_SIZE);
		out[0] = Major.Unsigned | UINT16_ADDITIONAL_DATA;
		const view = new DataView(out.buffer, 1);
		view.setUint16(0, n, false); // big-endian
		return out;
	} else if (n <= UINT32_MAX) {
		// 4-byte
		const out = new Uint8Array(1 + UINT32_SIZE);
		out[0] = Major.Unsigned | UINT32_ADDITIONAL_DATA;
		const view = new DataView(out.buffer, 1);
		view.setUint32(0, n, false); // big-endian
		return out;
	} else {
		// 8-byte
		const out = new Uint8Array(1 + UINT64_SIZE);
		out[0] = Major.Unsigned | UINT64_ADDITIONAL_DATA;
		const view = new DataView(out.buffer, 1);
		setUint64(view, 0, BigInt(n));
		return out;
	}
}

function encodeNegativeInteger(n: number): Uint8Array {
	// For negative integers, CBOR stores (-1 - n)
	const absValue = -1 - n;

	if (absValue <= DIRECT_ENCODING_MAX) {
		return new Uint8Array([Major.Negative | absValue]);
	} else if (absValue <= UINT8_MAX) {
		return new Uint8Array([Major.Negative | UINT8_ADDITIONAL_DATA, absValue]);
	} else if (absValue <= UINT16_MAX) {
		const out = new Uint8Array(1 + UINT16_SIZE);
		out[0] = Major.Negative | UINT16_ADDITIONAL_DATA;
		const view = new DataView(out.buffer, 1);
		view.setUint16(0, absValue, false); // big-endian
		return out;
	} else if (absValue <= UINT32_MAX) {
		const out = new Uint8Array(1 + UINT32_SIZE);
		out[0] = Major.Negative | UINT32_ADDITIONAL_DATA;
		const view = new DataView(out.buffer, 1);
		view.setUint32(0, absValue, false); // big-endian
		return out;
	} else {
		const out = new Uint8Array(1 + UINT64_SIZE);
		out[0] = Major.Negative | UINT64_ADDITIONAL_DATA;
		const view = new DataView(out.buffer, 1);
		setUint64(view, 0, BigInt(absValue));
		return out;
	}
}

function decodeUnsignedInteger(
	data: Uint8Array,
	offset: number,
	additionalInfo: number,
): number {
	if (additionalInfo <= DIRECT_ENCODING_MAX) {
		return additionalInfo;
	} else if (additionalInfo === UINT8_ADDITIONAL_DATA) {
		if (offset + 2 > data.length) {
			throw new Error("Insufficient data for uint8");
		}
		return data[offset + 1];
	} else if (additionalInfo === UINT16_ADDITIONAL_DATA) {
		const view = createDataView(data, offset + 1, 2);
		return view.getUint16(0, false);
	} else if (additionalInfo === UINT32_ADDITIONAL_DATA) {
		const view = createDataView(data, offset + 1, 4);
		return view.getUint32(0, false);
	} else if (additionalInfo === UINT64_ADDITIONAL_DATA) {
		const view = createDataView(data, offset + 1, 8);
		const bigintValue = getUint64(view, 0);

		// Check if the value fits in JavaScript's safe integer range
		if (bigintValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
			return Number(bigintValue);
		} else {
			throw new Error(
				`Uint64 value ${bigintValue} exceeds JavaScript's safe integer range`,
			);
		}
	} else {
		throw new Error(
			`Invalid additional info for unsigned integer: ${additionalInfo}`,
		);
	}
}

function decodeNegativeInteger(
	data: Uint8Array,
	offset: number,
	additionalInfo: number,
): number {
	let absValue: number;

	if (additionalInfo <= DIRECT_ENCODING_MAX) {
		absValue = additionalInfo;
	} else if (additionalInfo === UINT8_ADDITIONAL_DATA) {
		if (offset + 2 > data.length) {
			throw new Error("Insufficient data for uint8");
		}
		absValue = data[offset + 1];
	} else if (additionalInfo === UINT16_ADDITIONAL_DATA) {
		const view = createDataView(data, offset + 1, 2);
		absValue = view.getUint16(0, false);
	} else if (additionalInfo === UINT32_ADDITIONAL_DATA) {
		const view = createDataView(data, offset + 1, 4);
		absValue = view.getUint32(0, false);
	} else if (additionalInfo === UINT64_ADDITIONAL_DATA) {
		const view = createDataView(data, offset + 1, 8);
		const bigintValue = getUint64(view, 0);

		// Check if the value fits in JavaScript's safe integer range
		if (bigintValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
			absValue = Number(bigintValue);
		} else {
			throw new Error(
				`Uint64 value ${bigintValue} exceeds JavaScript's safe integer range`,
			);
		}
	} else {
		throw new Error(
			`Invalid additional info for negative integer: ${additionalInfo}`,
		);
	}

	// Convert to negative integer: CBOR stores (-1 - n), so n = -1 - absValue
	return -1 - absValue;
}
