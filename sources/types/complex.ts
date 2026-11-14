import type { CBORArray, CBORMap, CBORObject, CBORReader, ReadResult } from "../common/codec.js";
import { DecodedMap } from "./mapkey.js";

export function* decodeArray(
	length: number | undefined,
	offset: number,
	reader: CBORReader,
): ReadResult<CBORArray> {
	const array: CBORArray = [];
	while (length === undefined ? !(yield* reader.isBreak(offset)) : array.length < length) {
		const item = yield* reader.readValue(offset);
		array.push(item.value);
		offset = item.nextOffset;
	}
	return { value: array, nextOffset: length === undefined ? offset + 1 : offset };
}

export function* decodeMap(
	length: number | undefined,
	offset: number,
	reader: CBORReader,
): ReadResult<CBORMap | CBORObject> {
	const map = new DecodedMap();
	for (
		let index = 0;
		length === undefined ? !(yield* reader.isBreak(offset)) : index < length;
		index++
	) {
		const key = yield* reader.readValue(offset);
		map.checkKey(key.value);

		const item = yield* reader.readValue(key.nextOffset);
		map.set(key.value, item.value);
		offset = item.nextOffset;
	}
	return { value: map.value(), nextOffset: length === undefined ? offset + 1 : offset };
}
