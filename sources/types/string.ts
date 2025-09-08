import { Major } from "../common/common";
import { parseCBORHeader, validateMajorType } from "../common/parser";
import { decodeLength, encodeLength } from "../common/length";

export function encodeString(value: string): Uint8Array {
	const utf8Bytes = new TextEncoder().encode(value);
	const length = utf8Bytes.length;

	const lengthHeader = encodeLength(length, Major.Text);

	const result = new Uint8Array(lengthHeader.length + utf8Bytes.length);
	result.set(lengthHeader, 0);
	result.set(utf8Bytes, lengthHeader.length);

	return result;
}

export function decodeString(data: Uint8Array): string {
	const { majorType, additionalInfo } = parseCBORHeader(data, 0);
	validateMajorType(majorType, Major.Text, "string");

	// Decode the length
	const { length, headerSize } = decodeLength(
		data,
		0,
		additionalInfo,
		"string length",
	);

	// Extract the string bytes
	const stringStart = headerSize;
	const stringEnd = stringStart + length;

	if (stringEnd > data.length) {
		throw new Error("Insufficient data for string content");
	}

	const stringBytes = data.slice(stringStart, stringEnd);

	// Decode UTF-8 bytes to string
	return new TextDecoder().decode(stringBytes);
}
