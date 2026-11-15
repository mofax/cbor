import { Major } from "../common/common.js";
import type { ByteWriter } from "../common/writer.js";
import { writeByteString } from "./bytes.js";

const typedArrayTags = [
	[64, Uint8Array],
	[65, Uint16Array],
	[66, Uint32Array],
	[67, BigUint64Array],
	[68, Uint8ClampedArray],
	[72, Int8Array],
	[73, Int16Array],
	[74, Int32Array],
	[75, BigInt64Array],
	[81, Float32Array],
	[82, Float64Array],
] as const;

type TypedArrayConstructor = (typeof typedArrayTags)[number][1];
export type CBORTypedArray =
	| Uint8Array
	| Uint8ClampedArray
	| Uint16Array
	| Uint32Array
	| BigUint64Array
	| Int8Array
	| Int16Array
	| Int32Array
	| BigInt64Array
	| Float32Array
	| Float64Array;

const nativeLittleEndian = new Uint8Array(Uint16Array.of(1).buffer)[0] === 1;
const decodeTags = new Map<
	number | bigint,
	{ ctor: TypedArrayConstructor; littleEndian: boolean }
>();
for (const [tag, ctor] of typedArrayTags) {
	decodeTags.set(tag, { ctor, littleEndian: false });
	if (ctor.BYTES_PER_ELEMENT > 1) {
		decodeTags.set(tag + 4, { ctor, littleEndian: true });
	}
}

function reverseElements(bytes: Uint8Array, width: number): void {
	for (let offset = 0; offset < bytes.length; offset += width) {
		for (let left = offset, right = offset + width - 1; left < right; left++, right--) {
			const first = bytes[left];
			bytes[left] = bytes[right];
			bytes[right] = first;
		}
	}
}

export function writeTypedArray(
	writer: ByteWriter,
	value: ArrayBufferView,
	indefinite: boolean,
): void {
	for (const [tag, ctor] of typedArrayTags) {
		if (value instanceof ctor) {
			const width = ctor.BYTES_PER_ELEMENT;
			const view = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
			writer.writeArgument(Major.Tag, tag);
			writeByteString(writer, view, indefinite, nativeLittleEndian ? width : 1);
			return;
		}
	}
	throw new TypeError("Unsupported CBOR typed array");
}

export function decodeTypedArray(
	tag: number | bigint,
	value: unknown,
	ownedBytes: boolean,
): CBORTypedArray | undefined {
	const format = decodeTags.get(tag);
	if (!format) {
		return undefined;
	}
	if (!(value instanceof Uint8Array)) {
		throw new Error(`Typed array tag ${tag} requires a byte string`);
	}

	const width = format.ctor.BYTES_PER_ELEMENT;
	if (value.byteLength % width !== 0) {
		throw new Error(`Invalid byte length for typed array tag ${tag}`);
	}
	// Direct byte-string payloads have an exact-sized, unshared buffer.
	const bytes = ownedBytes ? (value as Uint8Array<ArrayBuffer>) : new Uint8Array(value);
	if (width > 1 && format.littleEndian !== nativeLittleEndian) {
		reverseElements(bytes, width);
	}
	return new format.ctor(bytes.buffer);
}
