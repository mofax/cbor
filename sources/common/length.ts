import { createDataView, requireBytes } from "./parser.js";

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
export const argumentWidths = [1, UINT16_SIZE, UINT32_SIZE, UINT64_SIZE];

export function encodeLength(length: number | bigint, majorType: number): Uint8Array {
	const size = argumentSize(length);
	const out = new Uint8Array(size);
	writeArgumentAt(out, 0, majorType, length, size);
	return out;
}

export function argumentSize(argument: number | bigint): number {
	if (argument <= DIRECT_ENCODING_MAX) {
		return 1;
	}
	if (argument <= UINT8_MAX) {
		return 2;
	}
	if (argument <= UINT16_MAX) {
		return 3;
	}
	return argument <= UINT32_MAX ? 5 : 9;
}

export function writeArgumentAt(
	data: Uint8Array,
	offset: number,
	major: number,
	argument: number | bigint,
	size: number,
): void {
	switch (size) {
		case 1:
			data[offset] = major | Number(argument);
			break;
		case 2:
			data[offset] = major | UINT8_ADDITIONAL_DATA;
			data[offset + 1] = Number(argument);
			break;
		case 3:
			data[offset] = major | UINT16_ADDITIONAL_DATA;
			new DataView(data.buffer, data.byteOffset).setUint16(offset + 1, Number(argument));
			break;
		case 5:
			data[offset] = major | UINT32_ADDITIONAL_DATA;
			new DataView(data.buffer, data.byteOffset).setUint32(offset + 1, Number(argument));
			break;
		default:
			data[offset] = major | UINT64_ADDITIONAL_DATA;
			new DataView(data.buffer, data.byteOffset).setBigUint64(offset + 1, BigInt(argument));
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
	return {
		argument: readExtendedArgument(data, offset + 1, additionalInfo, context),
		headerSize: 1 + argumentWidths[additionalInfo - UINT8_ADDITIONAL_DATA],
	};
}

export function readExtendedArgument(
	data: Uint8Array,
	body: number,
	additionalInfo: number,
	context: string,
): number | bigint {
	const width = argumentWidths[additionalInfo - UINT8_ADDITIONAL_DATA];
	if (width === undefined) {
		throw new Error(`Invalid additional info for ${context}: ${additionalInfo}`);
	}
	requireBytes(data, body, width);
	switch (additionalInfo) {
		case UINT8_ADDITIONAL_DATA:
			return data[body];
		case UINT16_ADDITIONAL_DATA:
			return data[body] * 256 + data[body + 1];
		case UINT32_ADDITIONAL_DATA:
			return (
				data[body] * 0x1000000 + (data[body + 1] << 16) + (data[body + 2] << 8) + data[body + 3]
			);
		default: {
			const value = createDataView(data, body, UINT64_SIZE).getBigUint64(0);
			return value <= 9007199254740991n ? Number(value) : value;
		}
	}
}
