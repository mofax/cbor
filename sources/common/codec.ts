import { Major } from "./common";
import { parseCBORHeader } from "./parser";
import * as numbers from "../types/number";
import * as string from "../types/string";
import * as bytes from "../types/bytes";
import * as simple from "../types/simple";
import * as date from "../types/date";

interface _CBORTaggable {
	__is_cbor_taggable__: true;
	__custom_tag__: number;
	toCBOR(): Uint8Array;
	fromCBOR(data: Uint8Array): unknown;
}

type _CBORObject = {
	[key: string]: CBORValue | _CBORObject | _CBORArray | CBORDate;
};
type _CBORArray = Array<CBORValue | _CBORObject | _CBORArray | CBORDate>;

export type CBORDate = Date;
export type CBORBytes = Uint8Array;
export type CBORObject = {
	[key: string]: CBORValue | _CBORObject | _CBORArray | CBORDate | CBORBytes;
};
export type CBORArray = Array<
	CBORValue | _CBORObject | _CBORArray | CBORDate | CBORBytes
>;
export type CBORValue = string | number | boolean | null;
// all encompassing type
export type CBORIO =
	| CBORValue
	| CBORObject
	| CBORArray
	| CBORDate
	| CBORBytes
	| _CBORTaggable;

/**
 * Encodes any CBOR value to bytes (except arrays and maps - use array.encodeArray or map.encodeMap directly)
 */
export function encodeCBORValue(value: unknown): Uint8Array {
	if (typeof value === "string") {
		return string.encodeString(value);
	} else if (value instanceof Uint8Array) {
		return bytes.encodeBytes(value);
	} else if (typeof value === "number") {
		return numbers.encodeNumber(value);
	} else if (typeof value === "boolean") {
		return simple.encodeBoolean(value);
	} else if (value === null) {
		return simple.encodeNull();
	} else if (value instanceof Date) {
		return date.encodeDate(value);
	} else if (Array.isArray(value)) {
		// For arrays, we need to handle this in the array module to avoid circular dependency
		throw new Error("Array encoding should be handled by array.encodeArray()");
	} else if (typeof value === "object" && value !== null) {
		// For objects/maps, we need to handle this in the map module to avoid circular dependency
		throw new Error("Object encoding should be handled by map.encodeMap()");
	} else {
		throw new Error(`Unsupported CBOR type: ${typeof value}`);
	}
}

/**
 * Decodes CBOR data starting at the given offset (except arrays and maps - use array.decodeArray or map.decodeMap directly)
 */
export function decodeCBORValue(
	data: Uint8Array,
	offset: number = 0,
): { value: CBORValue | CBORDate | CBORBytes; bytesConsumed: number } {
	const { majorType, additionalInfo } = parseCBORHeader(data, offset);

	switch (majorType) {
		case Major.Text: {
			const slice = data.slice(offset);
			const value = string.decodeString(slice);
			const bytesConsumed = calculateStringBytesConsumed(slice, additionalInfo);
			return { value, bytesConsumed };
		}
		case Major.Bytes: {
			const slice = data.slice(offset);
			const value = bytes.decodeBytes(slice);
			const bytesConsumed = calculateBytesBytesConsumed(slice, additionalInfo);
			return { value, bytesConsumed };
		}
		case Major.Unsigned:
		case Major.Negative: {
			const slice = data.slice(offset);
			const value = numbers.decodeNumber(slice);
			const bytesConsumed = calculateNumberBytesConsumed(additionalInfo);
			return { value, bytesConsumed };
		}
		case Major.Tag: {
			// Check if it's a date tag
			if (date.isDateValue(data, offset)) {
				const slice = data.slice(offset);
				const value = date.decodeDate(slice);
				const bytesConsumed = date.calculateDateBytesConsumed(slice);
				return { value, bytesConsumed };
			} else {
				throw new Error(`Unsupported tag: ${additionalInfo}`);
			}
		}
		case Major.Array: {
			// For arrays, we need to handle this in the array module to avoid circular dependency
			throw new Error(
				"Array decoding should be handled by array.decodeArray()",
			);
		}
		case Major.Map: {
			// For maps, we need to handle this in the map module to avoid circular dependency
			throw new Error(
				"Map decoding should be handled by map.decodeMap()",
			);
		}
		case Major.Simple: {
			if (additionalInfo === 20 || additionalInfo === 21) {
				const slice = data.slice(offset);
				const value = simple.decodeBoolean(slice);
				return { value, bytesConsumed: 1 };
			} else if (additionalInfo === 22) {
				const slice = data.slice(offset);
				const value = simple.decodeNull(slice);
				return { value, bytesConsumed: 1 };
			} else if (additionalInfo === 27) {
				// Float64
				const slice = data.slice(offset);
				const value = numbers.decodeNumber(slice);
				return { value, bytesConsumed: 9 }; // 1 byte header + 8 bytes float64
			} else {
				throw new Error(
					`Unsupported simple value with additional info: ${additionalInfo}`,
				);
			}
		}
		default:
			throw new Error(`Unsupported major type: ${majorType >> 5}`);
	}
}

// Helper functions for calculating bytes consumed
function calculateNumberBytesConsumed(additionalInfo: number): number {
	if (additionalInfo <= 23) {
		return 1;
	} else if (additionalInfo === 24) {
		return 2;
	} else if (additionalInfo === 25) {
		return 3;
	} else if (additionalInfo === 26) {
		return 5;
	} else if (additionalInfo === 27) {
		return 9;
	} else {
		throw new Error(`Invalid additional info for number: ${additionalInfo}`);
	}
}

function calculateStringBytesConsumed(
	data: Uint8Array,
	additionalInfo: number,
): number {
	let headerSize: number;
	let contentLength: number;

	if (additionalInfo <= 23) {
		headerSize = 1;
		contentLength = additionalInfo;
	} else if (additionalInfo === 24) {
		headerSize = 2;
		contentLength = data[1];
	} else if (additionalInfo === 25) {
		headerSize = 3;
		const view = new DataView(data.buffer, data.byteOffset + 1, 2);
		contentLength = view.getUint16(0, false);
	} else if (additionalInfo === 26) {
		headerSize = 5;
		const view = new DataView(data.buffer, data.byteOffset + 1, 4);
		contentLength = view.getUint32(0, false);
	} else {
		throw new Error(`Unsupported string length encoding: ${additionalInfo}`);
	}

	return headerSize + contentLength;
}

function calculateBytesBytesConsumed(
	data: Uint8Array,
	additionalInfo: number,
): number {
	let headerSize: number;
	let contentLength: number;

	if (additionalInfo <= 23) {
		headerSize = 1;
		contentLength = additionalInfo;
	} else if (additionalInfo === 24) {
		headerSize = 2;
		contentLength = data[1];
	} else if (additionalInfo === 25) {
		headerSize = 3;
		const view = new DataView(data.buffer, data.byteOffset + 1, 2);
		contentLength = view.getUint16(0, false);
	} else if (additionalInfo === 26) {
		headerSize = 5;
		const view = new DataView(data.buffer, data.byteOffset + 1, 4);
		contentLength = view.getUint32(0, false);
	} else {
		throw new Error(`Unsupported bytes length encoding: ${additionalInfo}`);
	}

	return headerSize + contentLength;
}
