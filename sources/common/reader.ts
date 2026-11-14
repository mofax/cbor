import { joinChunks } from "./bytes.js";
import {
	decodeTag,
	type CBORArray,
	type CBORIO,
	type CBORMap,
	type CBORObject,
	type DecodeOptions,
} from "./codec.js";
import { BREAK, INDEFINITE_LENGTH, Major } from "./common.js";
import {
	argumentWidths,
	DIRECT_ENCODING_MAX,
	readExtendedArgument,
	UINT8_ADDITIONAL_DATA,
} from "./length.js";
import { IncompleteCBOR, requireBytes } from "./parser.js";
import { DecodedMap } from "../types/mapkey.js";
import { decodeNegativeInteger, floatSize, readFloat } from "../types/number.js";
import { readExtendedSimple, readSimple } from "../types/simple.js";
import { checkStringChunk, readStringPayload } from "../types/string.js";

export class CompleteReader {
	offset = 0;
	private view?: DataView;

	constructor(
		private readonly data: Uint8Array,
		private readonly options: DecodeOptions = {},
	) {}

	readValue(): CBORIO {
		const header = this.readHeader();
		const major = header & 0xe0;
		const info = header & 0x1f;
		switch (major) {
			case Major.Unsigned:
				return this.readArgument(info, "CBOR argument");
			case Major.Negative: {
				const argument = this.readArgument(info, "CBOR argument");
				return decodeNegativeInteger(argument);
			}
			case Major.Simple:
				return this.readSimpleValue(info);
			case Major.Tag: {
				const tag = this.readArgument(info, "CBOR argument");
				return decodeTag(tag, this.readValue(), this.options);
			}
			default:
				return this.readContainer(major, info);
		}
	}

	private readHeader(): number {
		if (this.offset >= this.data.length) {
			throw new IncompleteCBOR("Insufficient data to parse CBOR header");
		}
		return this.data[this.offset++];
	}

	private readArgument(info: number, context: string): number | bigint {
		if (info <= DIRECT_ENCODING_MAX) {
			return info;
		}
		const value = readExtendedArgument(this.data, this.offset, info, context);
		this.offset += argumentWidths[info - UINT8_ADDITIONAL_DATA];
		return value;
	}

	private readLength(info: number): number {
		const length = this.readArgument(info, "length");
		if (typeof length === "bigint") {
			throw new Error(`length ${length} exceeds JavaScript's safe integer range`);
		}
		return length;
	}

	private readSimpleValue(info: number): CBORIO {
		if (info < 24) {
			return readSimple(info);
		}
		if (info === 24) {
			requireBytes(this.data, this.offset, 1);
			return readExtendedSimple(this.data[this.offset++]);
		}
		const size = floatSize(info);
		requireBytes(this.data, this.offset, size);
		const view = (this.view ??= new DataView(
			this.data.buffer,
			this.data.byteOffset,
			this.data.byteLength,
		));
		const value = readFloat(view, this.offset, size);
		this.offset += size;
		return value;
	}

	private readContainer(major: number, info: number): CBORIO {
		const length = info === INDEFINITE_LENGTH ? undefined : this.readLength(info);
		switch (major) {
			case Major.Text:
			case Major.Bytes:
				return length === undefined ? this.readChunks(major) : this.readString(major, length);
			case Major.Array:
				return this.readArray(length);
			case Major.Map:
				return this.readMap(length);
			default:
				throw new Error(`Unsupported major type: ${major >> 5}`);
		}
	}

	private endOfContainer(): boolean {
		if (this.data[this.offset] !== BREAK) {
			return false;
		}
		this.offset++;
		return true;
	}

	private readArray(length: number | undefined): CBORArray {
		const array: CBORArray = [];
		while (length === undefined ? !this.endOfContainer() : array.length < length) {
			array.push(this.readValue());
		}
		return array;
	}

	private readMap(length: number | undefined): CBORMap | CBORObject {
		const map = new DecodedMap();
		for (let index = 0; length === undefined ? !this.endOfContainer() : index < length; index++) {
			const key = this.readValue();
			map.checkKey(key);
			map.set(key, this.readValue());
		}
		return map.value();
	}

	private readString(
		major: typeof Major.Text | typeof Major.Bytes,
		size: number,
	): string | Uint8Array {
		const value = readStringPayload(this.data, major, this.offset, size);
		this.offset += size;
		return value;
	}

	private readChunks(major: typeof Major.Text | typeof Major.Bytes): string | Uint8Array {
		const text: string[] = [];
		const bytes: Uint8Array[] = [];
		while (!this.endOfContainer()) {
			const header = this.readHeader();
			const info = header & 0x1f;
			checkStringChunk(major, header & 0xe0, info);
			const chunk = this.readString(major, this.readLength(info));
			if (typeof chunk === "string") {
				text.push(chunk);
			} else {
				bytes.push(chunk);
			}
		}
		return major === Major.Text ? text.join("") : joinChunks(bytes);
	}
}
