import { Major } from "../common/common";
import { parseCBORHeader } from "../common/parser";
import { decodeLength, encodeLength } from "../common/length";
import {
	type CBORObject,
	type CBORValue,
	decodeCBORValue,
	encodeCBORValue,
} from "../common/codec";

/**
 * Encodes a JavaScript array as a CBOR array
 */
export function encodeArray(arr: Array<unknown>): Uint8Array {
	const length = arr.length;
	const lengthBytes = encodeLength(length, Major.Array);

	// Encode each element
	const encodedElements: Uint8Array[] = [];
	let totalElementsSize = 0;

	for (const element of arr) {
		let encodedElement: Uint8Array;
		if (Array.isArray(element)) {
			// Handle arrays recursively
			encodedElement = encodeArray(element);
		} else if (typeof element === "object" && element !== null) {
			// Handle objects by calling map encoding
			encodedElement = encodeMap(element as CBORObject);
		} else {
			encodedElement = encodeCBORValue(element);
		}
		encodedElements.push(encodedElement);
		totalElementsSize += encodedElement.length;
	}

	// Combine length header with all elements
	const result = new Uint8Array(lengthBytes.length + totalElementsSize);
	let offset = 0;

	// Copy length header
	result.set(lengthBytes, offset);
	offset += lengthBytes.length;

	// Copy all elements
	for (const element of encodedElements) {
		result.set(element, offset);
		offset += element.length;
	}

	return result;
}

/**
 * Decodes a CBOR array to a JavaScript array
 */
export function decodeArray(data: Uint8Array): Array<CBORValue> {
	let offset = 0;

	const { majorType, additionalInfo } = parseCBORHeader(data, offset);

	if (majorType !== Major.Array) {
		throw new Error(`Expected array major type, got ${majorType >> 5}`);
	}

	// Decode array length
	const { length, headerSize } = decodeLength(
		data,
		offset,
		additionalInfo,
		"array length",
	);
	offset += headerSize;

	// Decode array elements
	const result: Array<CBORValue> = [];

	for (let i = 0; i < length; i++) {
		if (offset >= data.length) {
			throw new Error(`Insufficient data to decode array element ${i}`);
		}

		const { majorType: elementMajorType } = parseCBORHeader(data, offset);

		let value: any;
		let bytesConsumed: number;

		if (elementMajorType === Major.Array) {
			// Handle nested arrays recursively
			const slice = data.slice(offset);
			value = decodeArray(slice);
			// Calculate bytes consumed by encoding the array again and measuring length
			const encoded = encodeArray(value);
			bytesConsumed = encoded.length;
		} else if (elementMajorType === Major.Map) {
			// Handle maps
			const slice = data.slice(offset);
			value = decodeMap(slice);
			// Calculate bytes consumed by encoding the map again and measuring length
			const encoded = encodeMap(value);
			bytesConsumed = encoded.length;
		} else {
			const decoded = decodeCBORValue(data, offset);
			value = decoded.value;
			bytesConsumed = decoded.bytesConsumed;
		}

		result.push(value);
		offset += bytesConsumed;
	}

	return result;
}

/**
 * Encodes a JavaScript object/struct as a CBOR map
 */
export function encodeMap(map: CBORObject): Uint8Array {
	const entries = Object.entries(map);
	const lengthBytes = encodeLength(entries.length, Major.Map);

	const keyValueBytes: Uint8Array[] = [];

	for (const [key, value] of entries) {
		// Encode the key (always as a string in JavaScript objects)
		keyValueBytes.push(encodeCBORValue(key));

		// Encode the value
		if (Array.isArray(value)) {
			keyValueBytes.push(encodeArray(value));
		} else if (
			typeof value === "object" && value !== null && !Array.isArray(value)
		) {
			// Recursively encode nested objects
			keyValueBytes.push(encodeMap(value as CBORObject));
		} else {
			keyValueBytes.push(encodeCBORValue(value));
		}
	}

	// Calculate total length
	const totalLength = lengthBytes.length +
		keyValueBytes.reduce((sum, bytes) => sum + bytes.length, 0);

	// Create result buffer
	const result = new Uint8Array(totalLength);
	let offset = 0;

	// Copy length bytes
	result.set(lengthBytes, offset);
	offset += lengthBytes.length;

	// Copy all key-value bytes
	for (const bytes of keyValueBytes) {
		result.set(bytes, offset);
		offset += bytes.length;
	}

	return result;
}

/**
 * Decodes a CBOR map to a JavaScript object/struct
 */
export function decodeMap(data: Uint8Array): CBORObject {
	let offset = 0;

	const { majorType, additionalInfo } = parseCBORHeader(data, offset);

	if (majorType !== Major.Map) {
		throw new Error(`Expected map major type, got ${majorType >> 5}`);
	}

	const { length: mapLength, headerSize } = decodeLength(
		data,
		offset,
		additionalInfo,
		"map length",
	);
	offset += headerSize;

	const result: CBORObject = {};

	for (let i = 0; i < mapLength; i++) {
		if (offset >= data.length) {
			throw new Error(`Insufficient data to decode map entry ${i}`);
		}

		// Decode key
		const { value: key, bytesConsumed: keyBytesConsumed } = decodeCBORValue(
			data,
			offset,
		);
		offset += keyBytesConsumed;

		if (typeof key !== "string") {
			throw new Error(`Map keys must be strings, got ${typeof key}`);
		}

		if (offset >= data.length) {
			throw new Error(`Insufficient data to decode value for key "${key}"`);
		}

		// Decode value
		const { majorType: valueMajorType } = parseCBORHeader(data, offset);

		let value: any;
		let valueBytesConsumed: number;

		if (valueMajorType === Major.Array) {
			const slice = data.slice(offset);
			value = decodeArray(slice);
			// Calculate bytes consumed by encoding the array again and measuring length
			const encoded = encodeArray(value);
			valueBytesConsumed = encoded.length;
		} else if (valueMajorType === Major.Map) {
			// Recursively decode nested maps
			const slice = data.slice(offset);
			value = decodeMap(slice);
			// Calculate bytes consumed by encoding the map again and measuring length
			const encoded = encodeMap(value);
			valueBytesConsumed = encoded.length;
		} else {
			const decoded = decodeCBORValue(data, offset);
			value = decoded.value;
			valueBytesConsumed = decoded.bytesConsumed;
		}

		offset += valueBytesConsumed;
		result[key] = value;
	}

	return result;
}
