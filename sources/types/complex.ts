import type { CBORArray, CBORIO, CBORObject, Decoded } from "../common/codec.js";
import { Major } from "../common/common.js";
import { encodeLength } from "../common/length.js";

export function encodeArray(
	arr: unknown[],
	encodeValue: (value: unknown) => Uint8Array,
): Uint8Array {
	const chunks = [encodeLength(arr.length, Major.Array)];
	for (const value of arr) {
		chunks.push(encodeValue(value));
	}
	return joinChunks(chunks);
}

export function encodeMap(map: object, encodeValue: (value: unknown) => Uint8Array): Uint8Array {
	const entries = Object.entries(map);
	const chunks = [encodeLength(entries.length, Major.Map)];
	for (const [key, value] of entries) {
		chunks.push(encodeValue(key), encodeValue(value));
	}
	return joinChunks(chunks);
}

function joinChunks(chunks: Uint8Array[]): Uint8Array {
	const result = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
}

export function decodeArray(
	length: number,
	offset: number,
	readValue: (offset: number) => Decoded<CBORIO>,
): Decoded<CBORArray> {
	const array: CBORArray = [];
	for (let index = 0; index < length; index++) {
		const item = readValue(offset);
		array.push(item.value);
		offset = item.nextOffset;
	}
	return { value: array, nextOffset: offset };
}

export function decodeMap(
	length: number,
	offset: number,
	readValue: (offset: number) => Decoded<CBORIO>,
): Decoded<CBORObject> {
	const map: CBORObject = {};
	for (let index = 0; index < length; index++) {
		const key = readValue(offset);
		if (typeof key.value !== "string") {
			throw new Error("CBOR map keys must be strings");
		}
		if (Object.hasOwn(map, key.value)) {
			throw new Error(`Duplicate CBOR map key: ${key.value}`);
		}

		const item = readValue(key.nextOffset);
		Object.defineProperty(map, key.value, {
			value: item.value,
			enumerable: true,
			configurable: true,
			writable: true,
		});
		offset = item.nextOffset;
	}
	return { value: map, nextOffset: offset };
}
