import { compareBytes, joinChunks, joinIndefinite } from "../common/bytes.js";
import type {
	CBORArray,
	CBORIO,
	CBORMap,
	CBORObject,
	CBORReader,
	EncodeOptions,
	ReadResult,
} from "../common/codec.js";
import { Major } from "../common/common.js";
import { encodeLength } from "../common/length.js";
import { mapKeyIdentity } from "./mapkey.js";

type EncodeValue = (value: CBORIO) => Uint8Array;
type MapEntry = [CBORIO, CBORIO];

export function encodeArray(
	array: CBORArray,
	encodeValue: EncodeValue,
	indefinite: boolean,
): Uint8Array {
	const items: Uint8Array[] = [];
	for (const value of array) {
		items.push(encodeValue(value));
	}
	return encodeContainer(Major.Array, array.length, items, indefinite);
}

export function encodeMap(
	map: CBORMap | CBORObject,
	encodeValue: EncodeValue,
	{ deterministic, indefinite }: Required<EncodeOptions>,
): Uint8Array {
	const entries = map instanceof Map ? [...map.entries()] : Object.entries(map);
	const encoded = entries.map(([key, value]) => ({ bytes: encodeValue(key), key, value }));
	if (deterministic) {
		encoded.sort((left, right) => compareBytes(left.bytes, right.bytes));
	}
	const identities = new Set<string>();
	const wireKeys = new Set<string>();
	const items: Uint8Array[] = [];
	for (const { bytes, key, value } of encoded) {
		const identity = mapKeyIdentity(key);
		const wireKey = bytes.join(",");
		if (identities.has(identity) || wireKeys.has(wireKey)) {
			throw new Error("Duplicate CBOR map key");
		}
		identities.add(identity);
		wireKeys.add(wireKey);
		items.push(bytes, encodeValue(value));
	}
	return encodeContainer(Major.Map, entries.length, items, indefinite);
}

function encodeContainer(
	major: number,
	length: number,
	items: Uint8Array[],
	indefinite: boolean,
): Uint8Array {
	return indefinite
		? joinIndefinite(major, items)
		: joinChunks([encodeLength(length, major), ...items]);
}

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
	const entries: MapEntry[] = [];
	const identities = new Set<string>();
	while (length === undefined ? !(yield* reader.isBreak(offset)) : entries.length < length) {
		const key = yield* reader.readValue(offset);
		const identity = mapKeyIdentity(key.value);
		if (identities.has(identity)) {
			throw new Error("Duplicate CBOR map key");
		}
		identities.add(identity);

		const item = yield* reader.readValue(key.nextOffset);
		entries.push([key.value, item.value]);
		offset = item.nextOffset;
	}
	const value = entries.every(([key]) => typeof key === "string")
		? Object.fromEntries(entries)
		: new Map(entries);
	return { value, nextOffset: length === undefined ? offset + 1 : offset };
}
