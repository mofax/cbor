import { joinChunks } from "./bytes.js";
import { decodeTag, type CBORArray, type CBORIO, type DecodeOptions } from "./codec.js";
import { BREAK, INDEFINITE_LENGTH, Major } from "./common.js";
import {
	argumentWidths,
	DIRECT_ENCODING_MAX,
	readExtendedArgument,
	UINT8_ADDITIONAL_DATA,
} from "./length.js";
import { IncompleteCBOR } from "./parser.js";
import { DecodedMap, MapKeyIndex } from "../types/mapkey.js";
import { decodeNegativeInteger, floatSize, readFloat } from "../types/number.js";
import { readExtendedSimple, readSimple } from "../types/simple.js";
import { checkStringChunk, readStringPayload } from "../types/string.js";

const NEED_MORE = Symbol();
const CONTINUE = Symbol();
const NO_KEY = Symbol();
type ReadStep = CBORIO | typeof NEED_MORE | typeof CONTINUE;

type StringFrame =
	| { major: typeof Major.Text; chunks: string[] }
	| { major: typeof Major.Bytes; chunks: Uint8Array[] };

type Frame =
	| StringFrame
	| { major: typeof Major.Tag; tag: number | bigint }
	| { major: typeof Major.Array; remaining: number | undefined; array: CBORArray }
	| {
			major: typeof Major.Map;
			remaining: number | undefined;
			map: DecodedMap;
			key: CBORIO | typeof NO_KEY;
	  };

export async function* unpackStream(
	chunks: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
	options?: DecodeOptions,
): AsyncGenerator<CBORIO> {
	const reader = new StreamReader(options);
	for await (const chunk of chunks) {
		if (chunk.length === 0) {
			continue;
		}
		reader.append(chunk);
		for (let value = reader.read(); value !== NEED_MORE; value = reader.read()) {
			yield value;
		}
	}
	reader.finish();
}

class StreamReader {
	private data = new Uint8Array(0);
	private length = 0;
	private offset = 0;
	private view?: DataView;
	private keys?: MapKeyIndex;
	private readonly frames: Frame[] = [];

	constructor(private readonly options?: DecodeOptions) {}

	append(chunk: Uint8Array): void {
		const unread = this.length - this.offset;
		const length = unread + chunk.length;
		if (length > this.data.length) {
			const next = new Uint8Array(Math.max(length, this.data.length * 2));
			next.set(this.data.subarray(this.offset, this.length));
			this.data = next;
			this.view = undefined;
		} else if (unread > 0 && this.offset > 0) {
			this.data.copyWithin(0, this.offset, this.length);
		}
		this.data.set(chunk, unread);
		this.length = length;
		this.offset = 0;
	}

	finish(): void {
		if (this.offset !== this.length || this.frames.length > 0) {
			throw new IncompleteCBOR("Insufficient data to finish CBOR item");
		}
	}

	read(): CBORIO | typeof NEED_MORE {
		while (this.offset < this.length) {
			const result = this.readStep();
			if (result !== CONTINUE) {
				return result;
			}
		}
		return NEED_MORE;
	}

	private readStep(): ReadStep {
		const header = this.data[this.offset];
		const frame = this.frames[this.frames.length - 1];
		if (header === BREAK && frame && this.canClose(frame)) {
			this.offset++;
			this.frames.pop();
			return this.accept(this.close(frame), frame.major === Major.Bytes);
		}
		const major = header & 0xe0;
		const info = header & 0x1f;
		if (frame?.major === Major.Text || frame?.major === Major.Bytes) {
			return this.readChunk(frame, major, info);
		}
		return this.readValue(major, info);
	}

	private readValue(major: number, info: number): ReadStep {
		switch (major) {
			case Major.Simple: {
				const value = this.readSimple(info);
				return value === NEED_MORE ? NEED_MORE : this.accept(value);
			}
			case Major.Unsigned:
			case Major.Negative:
			case Major.Tag:
				return this.readNumberOrTag(major, info);
			default:
				return this.readContainer(major, info);
		}
	}

	private readNumberOrTag(major: number, info: number): ReadStep {
		const argument = this.readArgument(info, "CBOR argument");
		if (argument === NEED_MORE) {
			return NEED_MORE;
		}
		if (major === Major.Tag) {
			this.frames.push({ major, tag: argument });
			return CONTINUE;
		}
		return this.accept(major === Major.Unsigned ? argument : decodeNegativeInteger(argument));
	}

	private readContainer(major: number, info: number): ReadStep {
		if (info === INDEFINITE_LENGTH) {
			this.offset++;
			this.open(major, undefined);
			return CONTINUE;
		}
		if (major === Major.Bytes || major === Major.Text) {
			const value = this.readString(major, info);
			return value === NEED_MORE ? NEED_MORE : this.accept(value, major === Major.Bytes);
		}
		const length = this.readLength(info);
		if (length === NEED_MORE) {
			return NEED_MORE;
		}
		if (length === 0) {
			return this.accept(major === Major.Array ? [] : {});
		}
		this.open(major, length);
		return CONTINUE;
	}

	private readChunk(frame: StringFrame, major: number, info: number): ReadStep {
		checkStringChunk(frame.major, major, info);
		const value = this.readString(frame.major, info);
		if (value === NEED_MORE) {
			return NEED_MORE;
		}
		if (typeof value === "string") {
			(frame.chunks as string[]).push(value);
		} else if (value.length > 0) {
			(frame.chunks as Uint8Array[]).push(value);
		}
		return CONTINUE;
	}

	private readString(
		major: typeof Major.Text | typeof Major.Bytes,
		info: number,
	): string | Uint8Array | typeof NEED_MORE {
		const header = this.offset;
		const length = this.readLength(info);
		if (length === NEED_MORE) {
			return NEED_MORE;
		}
		if (length > this.length - this.offset) {
			this.offset = header;
			return NEED_MORE;
		}
		const value = readStringPayload(this.data, major, this.offset, length);
		this.offset += length;
		return value;
	}

	private readLength(info: number): number | typeof NEED_MORE {
		const length = this.readArgument(info, "length");
		if (typeof length === "bigint") {
			throw new Error(`length ${length} exceeds JavaScript's safe integer range`);
		}
		return length;
	}

	private readArgument(info: number, context: string): number | bigint | typeof NEED_MORE {
		if (info <= DIRECT_ENCODING_MAX) {
			this.offset++;
			return info;
		}
		const width = argumentWidths[info - UINT8_ADDITIONAL_DATA];
		const start = this.offset + 1;
		if (width !== undefined && width > this.length - start) {
			return NEED_MORE;
		}
		const argument = readExtendedArgument(this.data, start, info, context);
		this.offset = start + width;
		return argument;
	}

	private readSimple(info: number): CBORIO | typeof NEED_MORE {
		if (info < 24) {
			this.offset++;
			return readSimple(info);
		}
		const size = info === 24 ? 1 : floatSize(info);
		const body = this.offset + 1;
		if (size > this.length - body) {
			return NEED_MORE;
		}
		this.offset = body + size;
		return size === 1
			? readExtendedSimple(this.data[body])
			: readFloat((this.view ??= new DataView(this.data.buffer)), body, size);
	}

	private open(major: number, remaining: number | undefined): void {
		switch (major) {
			case Major.Text:
			case Major.Bytes:
				this.frames.push({ major, chunks: [] });
				break;
			case Major.Array:
				this.frames.push({ major, remaining, array: [] });
				break;
			case Major.Map:
				this.frames.push({ major, remaining, map: new DecodedMap(), key: NO_KEY });
				break;
		}
	}

	private canClose(frame: Frame): frame is Exclude<Frame, { major: typeof Major.Tag }> {
		switch (frame.major) {
			case Major.Bytes:
			case Major.Text:
				return true;
			case Major.Array:
				return frame.remaining === undefined;
			case Major.Map:
				return frame.remaining === undefined && frame.key === NO_KEY;
			default:
				return false;
		}
	}

	private close(frame: Exclude<Frame, { major: typeof Major.Tag }>): CBORIO {
		switch (frame.major) {
			case Major.Array:
				return frame.array;
			case Major.Map:
				return frame.map.value();
			case Major.Text:
				return frame.chunks.join("");
			case Major.Bytes:
				return frame.chunks.length === 1 ? frame.chunks[0] : joinChunks(frame.chunks);
		}
	}

	private accept(value: CBORIO, ownedBytes = false): ReadStep {
		while (this.frames.length > 0) {
			const frame = this.frames[this.frames.length - 1];
			switch (frame.major) {
				case Major.Tag:
					value = decodeTag(frame.tag, value, this.options, ownedBytes);
					break;
				case Major.Array:
					frame.array.push(value);
					if (!this.consumeEntry(frame)) {
						return CONTINUE;
					}
					value = frame.array;
					break;
				case Major.Map:
					if (frame.key === NO_KEY) {
						this.checkKey(frame.map, value);
						frame.key = value;
						return CONTINUE;
					}
					frame.map.set(frame.key, value);
					frame.key = NO_KEY;
					if (!this.consumeEntry(frame)) {
						return CONTINUE;
					}
					value = frame.map.value();
					break;
				default:
					throw new Error("Invalid CBOR string chunk");
			}
			ownedBytes = false;
			this.frames.pop();
		}
		this.keys = undefined;
		return value;
	}
	private checkKey(map: DecodedMap, key: CBORIO): void {
		const index =
			this.options === undefined && key !== null && typeof key === "object"
				? (this.keys ??= new MapKeyIndex())
				: undefined;
		map.checkKey(key, index);
	}

	private consumeEntry(frame: { remaining: number | undefined }): boolean {
		return frame.remaining !== undefined && --frame.remaining === 0;
	}
}
