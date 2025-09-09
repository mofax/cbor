import { Major } from "../common/common";
import { parseCBORHeader, validateMajorType } from "../common/parser";
import { decodeLength, encodeLength } from "../common/length";

export function encodeBytes(value: Uint8Array): Uint8Array {
	const length = value.length;
	const lengthHeader = encodeLength(length, Major.Bytes);

	const result = new Uint8Array(lengthHeader.length + value.length);
	result.set(lengthHeader, 0);
	result.set(value, lengthHeader.length);

	return result;
}

export function decodeBytes(data: Uint8Array): Uint8Array {
	const { majorType, additionalInfo } = parseCBORHeader(data, 0);
	validateMajorType(majorType, Major.Bytes, "bytes");

	// Decode the length
	const { length, headerSize } = decodeLength(
		data,
		0,
		additionalInfo,
		"bytes length",
	);

	// Extract the byte data
	const bytesStart = headerSize;
	const bytesEnd = bytesStart + length;

	if (bytesEnd > data.length) {
		throw new Error("Insufficient data for bytes content");
	}

	const bytes = data.slice(bytesStart, bytesEnd);

	return bytes;
}
