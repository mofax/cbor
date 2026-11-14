import { joinChunks } from "./common/bytes.js";
import {
	type CBORIO,
	CBORReader,
	createEncoder,
	type DecodeOptions,
	type EncodeOptions,
	readComplete,
} from "./common/codec.js";
import { unpackStream } from "./common/stream.js";
import { CBORTag } from "./common/tags.js";
import { CBORSimple } from "./types/simple.js";

export type {
	CBORArray,
	CBORIO,
	CBORMap,
	CBORObject,
	DecodeOptions,
	EncodeOptions,
} from "./common/codec.js";
export type { CBORTag } from "./common/tags.js";
export type { CBORSimple } from "./types/simple.js";
export type { CBORTypedArray } from "./types/typedarray.js";

export const CBOR = {
	pack(value: CBORIO, options?: EncodeOptions): Uint8Array {
		return createEncoder(options)(value);
	},

	unpack(data: Uint8Array, options?: DecodeOptions): CBORIO {
		if (data.length === 0) {
			throw new Error("Cannot unpack empty data");
		}

		const { value, nextOffset } = readComplete(new CBORReader(data, options).readValue(0));
		if (nextOffset !== data.length) {
			throw new Error(`Unexpected trailing data at offset ${nextOffset}`);
		}

		return value;
	},

	tag(tag: number | bigint, value: CBORIO): CBORTag {
		return new CBORTag(tag, value);
	},

	simple(code: number): CBORSimple {
		return new CBORSimple(code);
	},

	packSequence(items: Iterable<CBORIO>, options?: EncodeOptions): Uint8Array {
		const encode = createEncoder(options);
		return joinChunks(Array.from(items, encode));
	},

	unpackSequence(data: Uint8Array, options?: DecodeOptions): CBORIO[] {
		const values: CBORIO[] = [];
		const reader = new CBORReader(data, options);
		let offset = 0;
		while (offset < data.length) {
			const item = readComplete(reader.readValue(offset));
			values.push(item.value);
			offset = item.nextOffset;
		}
		return values;
	},

	unpackStream,
};
