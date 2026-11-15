import { compareBytes } from "./bytes.js";
import type { CBORArray, CBORIO, CBORObject, EncodeOptions } from "./codec.js";
import { BREAK, INDEFINITE_LENGTH, Major } from "./common.js";
import { validateTag, CBORTag } from "./tags.js";
import { byteIdentity, ByteWriter } from "./writer.js";
import { encodeBytes, writeByteString } from "../types/bytes.js";
import { writeDate } from "../types/date.js";
import { mapKeyIdentity } from "../types/mapkey.js";
import { encodeNumber, writeBigInt, writeNumber } from "../types/number.js";
import { CBORSimple, writeSimple } from "../types/simple.js";
import { encodeString, writeText } from "../types/string.js";
import { writeTypedArray } from "../types/typedarray.js";

export function packValue(value: CBORIO, options?: EncodeOptions): Uint8Array {
	const { deterministic = false, indefinite = false } = options ?? {};
	if (deterministic && indefinite) {
		throw new TypeError("Deterministic CBOR requires definite lengths");
	}
	return encodeValue(value, deterministic, indefinite);
}

export function packSequence(items: Iterable<CBORIO>, options?: EncodeOptions): Uint8Array {
	const { deterministic = false, indefinite = false } = options ?? {};
	if (deterministic && indefinite) {
		throw new TypeError("Deterministic CBOR requires definite lengths");
	}
	const encoder = new Encoder(deterministic, indefinite);
	for (const item of items) {
		encoder.writeValue(item);
	}
	return encoder.finish();
}

function encodeValue(
	value: CBORIO,
	deterministic: boolean,
	indefinite: boolean,
	exact = true,
): Uint8Array {
	// These standalone values can allocate their final output directly.
	switch (typeof value) {
		case "number":
			return encodeNumber(value, deterministic);
		case "string":
			return encodeString(value, indefinite);
		case "boolean":
			return Uint8Array.of(Major.Simple | (value ? 21 : 20));
		case "undefined":
			return Uint8Array.of(Major.Simple | 23);
		default: {
			if (value === null) {
				return Uint8Array.of(Major.Simple | 22);
			}
			if (value instanceof Uint8Array) {
				return encodeBytes(value, indefinite);
			}
			const encoder = new Encoder(deterministic, indefinite);
			encoder.writeValue(value);
			return encoder.finish(exact);
		}
	}
}

class Encoder {
	private readonly writer = new ByteWriter();

	constructor(
		private readonly deterministic: boolean,
		private readonly indefinite: boolean,
	) {}

	finish(exact = true): Uint8Array {
		return this.writer.finish(exact);
	}

	writeValue(value: CBORIO): void {
		switch (typeof value) {
			case "number":
				writeNumber(this.writer, value, this.deterministic);
				break;
			case "string":
				writeText(this.writer, value, this.indefinite);
				break;
			case "bigint":
				writeBigInt(this.writer, value);
				break;
			case "boolean":
				this.writer.writeByte(Major.Simple | (value ? 21 : 20));
				break;
			case "undefined":
				this.writer.writeByte(Major.Simple | 23);
				break;
			case "object":
				if (value === null) {
					this.writer.writeByte(Major.Simple | 22);
				} else {
					this.writeObject(value);
				}
				break;
			default:
				throw new TypeError(`Unsupported CBOR type: ${typeof value}`);
		}
	}

	private writeObject(
		value: Exclude<CBORIO, string | number | bigint | boolean | null | undefined>,
	): void {
		if (Array.isArray(value)) {
			this.writeArray(value);
		} else if (value instanceof Uint8Array) {
			writeByteString(this.writer, value, this.indefinite);
		} else if (value instanceof Date) {
			writeDate(this.writer, value, this.deterministic);
		} else if (value instanceof CBORTag) {
			validateTag(value.tag);
			if (typeof value.tag === "number") {
				this.writer.writeArgument(Major.Tag, value.tag);
			} else {
				this.writer.writeBigArgument(Major.Tag, value.tag);
			}
			this.writeValue(value.value);
		} else if (value instanceof CBORSimple) {
			writeSimple(this.writer, value.code);
		} else if (ArrayBuffer.isView(value)) {
			writeTypedArray(this.writer, value, this.indefinite);
		} else if (value instanceof Map) {
			this.writeMapEntries([...value.entries()]);
		} else if (isPlainObject(value)) {
			this.writePlainObject(value);
		} else {
			throw new TypeError("CBOR maps require plain objects or Map instances");
		}
	}

	private writeArray(array: CBORArray): void {
		const start = this.writer.offset;
		const length = array.length;
		if (this.indefinite) {
			this.writer.writeByte(Major.Array | INDEFINITE_LENGTH);
		} else {
			this.writer.writeArgument(Major.Array, length);
		}
		for (const value of array) {
			this.writeValue(value);
		}
		if (this.indefinite) {
			this.writer.writeByte(BREAK);
		} else if (array.length !== length) {
			this.writer.updateArgument(Major.Array, start, length, array.length);
		}
	}

	private writeMapEntries(entries: [CBORIO, CBORIO][]): void {
		if (entries.length < 2) {
			this.startMap(entries.length);
			if (entries.length === 1) {
				const [key, value] = entries[0];
				this.writeValue(key);
				this.writeValue(value);
			}
			this.endMap();
			return;
		}
		if (this.deterministic || entries.some(([key]) => key !== null && typeof key === "object")) {
			this.writeMap(entries);
			return;
		}
		this.startMap(entries.length);
		const identities = new Set<CBORIO>();
		const wireKeys = new Set<string>();
		for (const [key, value] of entries) {
			const start = this.writer.offset;
			this.writeValue(key);
			const wireKey = this.writer.wireKey(start);
			if (identities.has(key) || wireKeys.has(wireKey)) {
				throw new Error("Duplicate CBOR map key");
			}
			identities.add(key);
			wireKeys.add(wireKey);
			this.writeValue(value);
		}
		this.endMap();
	}

	private writePlainObject(object: CBORObject): void {
		const entries = Object.entries(object);
		if (this.deterministic) {
			this.writeMapEntries(entries);
			return;
		}
		this.startMap(entries.length);
		let replacementKeys: Set<string> | undefined;
		for (const entry of entries) {
			const key = entry[0];
			// TextEncoder replaces lone surrogates with U+FFFD, which can merge distinct keys.
			if (/[\uD800-\uDFFF\uFFFD]/u.test(key)) {
				const normalized = key.replace(/[\uD800-\uDFFF]/gu, "\uFFFD");
				replacementKeys ??= new Set();
				if (replacementKeys.has(normalized)) {
					throw new Error("Duplicate CBOR map key");
				}
				replacementKeys.add(normalized);
			}
			writeText(this.writer, key, this.indefinite);
			this.writeValue(entry[1]);
		}
		this.endMap();
	}

	private writeMap(entries: [CBORIO, CBORIO][]): void {
		let nonTextKeys = 0;
		const encoded = entries.map(([key, value]) => {
			if (typeof key !== "string") {
				nonTextKeys++;
			}
			return { bytes: encodeValue(key, this.deterministic, this.indefinite, false), key, value };
		});
		if (this.deterministic) {
			encoded.sort((left, right) => compareBytes(left.bytes, right.bytes));
		}
		this.startMap(entries.length);
		// Text keys cannot collide with other types, and equal text keys also have equal wire bytes.
		const identities = nonTextKeys > 1 ? new Set<string>() : undefined;
		const wireKeys = this.deterministic ? undefined : new Set<string>();
		let previous: Uint8Array | undefined;
		for (const { bytes, key, value } of encoded) {
			checkNonTextKey(identities, key);
			let duplicateWireKey = false;
			if (wireKeys) {
				if (nonTextKeys > 1 || typeof key === "string") {
					const wireKey = byteIdentity(bytes);
					duplicateWireKey = wireKeys.has(wireKey);
					wireKeys.add(wireKey);
				}
			} else {
				duplicateWireKey = previous !== undefined && compareBytes(previous, bytes) === 0;
				previous = bytes;
			}
			if (duplicateWireKey) {
				throw new Error("Duplicate CBOR map key");
			}
			this.writer.writeBytes(bytes);
			this.writeValue(value);
		}
		this.endMap();
	}

	private startMap(length: number): void {
		if (this.indefinite) {
			this.writer.writeByte(Major.Map | INDEFINITE_LENGTH);
		} else {
			this.writer.writeArgument(Major.Map, length);
		}
	}

	private endMap(): void {
		if (this.indefinite) {
			this.writer.writeByte(BREAK);
		}
	}
}

function checkNonTextKey(identities: Set<string> | undefined, key: CBORIO): void {
	if (identities && typeof key !== "string") {
		const identity = mapKeyIdentity(key);
		if (identities.has(identity)) {
			throw new Error("Duplicate CBOR map key");
		}
		identities.add(identity);
	}
}

function isPlainObject(value: object): value is CBORObject {
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
