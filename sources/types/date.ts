import { Major } from "../common/common";
import { parseCBORHeader, validateMajorType } from "../common/parser";
import { decodeString, encodeString } from "./string";
import { decodeNumber, encodeNumber } from "./number";
import { DIRECT_ENCODING_MAX, UINT8_ADDITIONAL_DATA } from "../common/length";
import { encodeTag } from "../common/tags";

// CBOR semantic tags for dates
type DateTag = 0 | 1;
const TAG_EPOCH_TIMESTAMP = 1; // Epoch-based timestamp (seconds since Jan 1 1970 UTC)
const TAG_ISO_STRING = 0; // ISO 8601 date/time string

/**
 * Encodes a Date object as CBOR data.
 * By default encodes as epoch timestamp (tag 1), but can be configured to encode as ISO string (tag 0).
 */
export function encodeDate(
	date: Date,
	encoding: DateTag = TAG_EPOCH_TIMESTAMP,
): Uint8Array {
	if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
		throw new Error("Invalid Date object");
	}

	if (encoding === 1) {
		return encodeEpochTimestamp(date);
	} else if (encoding === 0) {
		return encodeISOString(date);
	} else {
		throw new Error(`Unsupported date encoding: ${encoding}`);
	}
}

/**
 * Decodes CBOR data as a Date object.
 * Supports both epoch timestamps (tag 1) and ISO strings (tag 0).
 */
export function decodeDate(data: Uint8Array): Date {
	const { majorType, additionalInfo } = parseCBORHeader(data, 0);
	validateMajorType(majorType, Major.Tag, "date");

	if (additionalInfo === TAG_EPOCH_TIMESTAMP) {
		return decodeEpochTimestamp(data);
	} else if (additionalInfo === TAG_ISO_STRING) {
		return decodeISOString(data);
	} else {
		throw new Error(`Unsupported date tag: ${additionalInfo}`);
	}
}

/**
 * Checks if the CBOR data at the given offset represents a date (has a date tag).
 */
export function isDateValue(data: Uint8Array, offset: number = 0): boolean {
	if (offset >= data.length) {
		return false;
	}

	const firstByte = data[offset];
	const majorType = firstByte & 0xe0;
	const additionalInfo = firstByte & 0x1f;

	return majorType === Major.Tag &&
		(additionalInfo === TAG_EPOCH_TIMESTAMP ||
			additionalInfo === TAG_ISO_STRING);
}

/**
 * Encodes a Date as an epoch timestamp with CBOR tag 1.
 */
function encodeEpochTimestamp(date: Date): Uint8Array {
	const epochMilliseconds = date.getTime();
	const tagHeader = encodeTag(TAG_EPOCH_TIMESTAMP);
	const encodedNumber = encodeNumber(epochMilliseconds);

	const result = new Uint8Array(tagHeader.length + encodedNumber.length);
	result.set(tagHeader, 0);
	result.set(encodedNumber, tagHeader.length);
	return result;
}

/**
 * Encodes a Date as an ISO string with CBOR tag 0.
 */
function encodeISOString(date: Date): Uint8Array {
	const isoString = date.toISOString();
	const tagHeader = encodeTag(TAG_ISO_STRING);
	const encodedString = encodeString(isoString);

	const result = new Uint8Array(tagHeader.length + encodedString.length);
	result.set(tagHeader, 0);
	result.set(encodedString, tagHeader.length);
	return result;
}

/**
 * Decodes a CBOR epoch timestamp (tag 1) as a Date.
 */
function decodeEpochTimestamp(data: Uint8Array): Date {
	// Skip the tag header (1 byte for simple tags)
	const numberData = data.slice(1);
	const epochMilliseconds = decodeNumber(numberData);

	if (!Number.isInteger(epochMilliseconds)) {
		throw new Error("Epoch timestamp must be an integer");
	}

	const date = new Date(epochMilliseconds);

	if (!isFinite(date.getTime())) {
		throw new Error("Invalid epoch timestamp");
	}

	return date;
}

/**
 * Decodes a CBOR ISO string (tag 0) as a Date.
 */
function decodeISOString(data: Uint8Array): Date {
	// Skip the tag header (1 byte for simple tags)
	const stringData = data.slice(1);
	const isoString = decodeString(stringData);

	const date = new Date(isoString);

	if (!isFinite(date.getTime())) {
		throw new Error(`Invalid ISO date string: ${isoString}`);
	}

	return date;
}

/**
 * Calculates the total bytes consumed by a date value including tag header.
 */
export function calculateDateBytesConsumed(
	data: Uint8Array,
	offset: number = 0,
): number {
	const { majorType, additionalInfo } = parseCBORHeader(data, offset);
	validateMajorType(majorType, Major.Tag, "date");

	let tagHeaderSize: number;
	if (additionalInfo <= DIRECT_ENCODING_MAX) {
		tagHeaderSize = 1;
	} else if (additionalInfo === UINT8_ADDITIONAL_DATA) {
		tagHeaderSize = 2;
	} else {
		throw new Error(`Unsupported tag encoding: ${additionalInfo}`);
	}

	// Calculate the size of the tagged value
	const taggedData = data.slice(offset + tagHeaderSize);
	const { majorType: valueMajorType, additionalInfo: valueAdditionalInfo } = parseCBORHeader(taggedData, 0);

	let valueSize: number;
	if (valueMajorType === Major.Unsigned || valueMajorType === Major.Negative) {
		// Numeric value (epoch timestamp)
		if (valueAdditionalInfo <= 23) {
			valueSize = 1;
		} else if (valueAdditionalInfo === 24) {
			valueSize = 2;
		} else if (valueAdditionalInfo === 25) {
			valueSize = 3;
		} else if (valueAdditionalInfo === 26) {
			valueSize = 5;
		} else if (valueAdditionalInfo === 27) {
			valueSize = 9;
		} else {
			throw new Error(
				`Invalid additional info for number: ${valueAdditionalInfo}`,
			);
		}
	} else if (valueMajorType === Major.Text) {
		// String value (ISO date)
		let contentLength: number;
		let headerSize: number;

		if (valueAdditionalInfo <= 23) {
			headerSize = 1;
			contentLength = valueAdditionalInfo;
		} else if (valueAdditionalInfo === 24) {
			headerSize = 2;
			contentLength = taggedData[1];
		} else if (valueAdditionalInfo === 25) {
			headerSize = 3;
			const view = new DataView(
				taggedData.buffer,
				taggedData.byteOffset + 1,
				2,
			);
			contentLength = view.getUint16(0, false);
		} else if (valueAdditionalInfo === 26) {
			headerSize = 5;
			const view = new DataView(
				taggedData.buffer,
				taggedData.byteOffset + 1,
				4,
			);
			contentLength = view.getUint32(0, false);
		} else {
			throw new Error(
				`Unsupported string length encoding: ${valueAdditionalInfo}`,
			);
		}

		valueSize = headerSize + contentLength;
	} else {
		throw new Error(`Unsupported tagged value type: ${valueMajorType >> 5}`);
	}

	return tagHeaderSize + valueSize;
}
