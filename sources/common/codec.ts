import { joinChunks } from "./bytes.js";
import { BREAK, INDEFINITE_LENGTH, Major } from "./common.js";
import { decodeArgument, decodeLength } from "./length.js";
import { IncompleteCBOR, parseCBORHeader } from "./parser.js";
import { CBORTag, encodeTag } from "./tags.js";
import { encodeBytes } from "../types/bytes.js";
import { decodeArray, decodeMap, encodeArray, encodeMap } from "../types/complex.js";
import { decodeDate, encodeDate } from "../types/date.js";
import {
	decodeBignum,
	decodeNegativeInteger,
	encodeBigInt,
	encodeNumber,
} from "../types/number.js";
import {
	CBORSimple,
	decodeSimple,
	encodeBoolean,
	encodeNull,
	encodeSimple,
} from "../types/simple.js";
import { decodeString, encodeString } from "../types/string.js";
import { type CBORTypedArray, decodeTypedArray, encodeTypedArray } from "../types/typedarray.js";

export type CBORObject = { [key: string]: CBORIO };
export type CBORArray = CBORIO[];
export type CBORMap = Map<CBORIO, CBORIO>;
export type CBORIO =
	| string
	| number
	| bigint
	| boolean
	| null
	| undefined
	| Date
	| CBORSimple
	| CBORTag
	| CBORTypedArray
	| CBORObject
	| CBORArray
	| CBORMap;

export interface EncodeOptions {
	indefinite?: boolean;
	deterministic?: boolean;
}

export interface DecodeOptions {
	tagHandlers?: ReadonlyMap<number | bigint, (value: CBORIO) => CBORIO>;
}

export interface Decoded<T> {
	value: T;
	nextOffset: number;
}

export type ReadResult<T> = Generator<IncompleteCBOR, Decoded<T>, void>;

export function createEncoder(options: EncodeOptions = {}): (value: CBORIO) => Uint8Array {
	const { deterministic = false, indefinite = false } = options;
	if (deterministic && indefinite) {
		throw new TypeError("Deterministic CBOR requires definite lengths");
	}

	function encodeValue(value: CBORIO): Uint8Array {
		switch (typeof value) {
			case "string":
				return encodeString(value, indefinite);
			case "number":
				return encodeNumber(value, deterministic);
			case "bigint":
				return encodeBigInt(value);
			case "boolean":
				return encodeBoolean(value);
			case "undefined":
				return encodeSimple(23);
			case "object":
				return value === null ? encodeNull() : encodeObject(value);
			default:
				throw new TypeError(`Unsupported CBOR type: ${typeof value}`);
		}
	}

	function encodeObject(
		value: Exclude<CBORIO, string | number | bigint | boolean | null | undefined>,
	): Uint8Array {
		if (value instanceof Uint8Array) {
			return encodeBytes(value, indefinite);
		}
		if (value instanceof Date) {
			return encodeDate(value, deterministic);
		}
		if (value instanceof CBORTag) {
			return joinChunks([encodeTag(value.tag), encodeValue(value.value)]);
		}
		if (value instanceof CBORSimple) {
			return encodeSimple(value.code);
		}
		if (ArrayBuffer.isView(value)) {
			return encodeTypedArray(value, indefinite);
		}
		if (Array.isArray(value)) {
			return encodeArray(value, encodeValue, indefinite);
		}
		if (value instanceof Map || isPlainObject(value)) {
			return encodeMap(value, encodeValue, { deterministic, indefinite });
		}
		throw new TypeError("CBOR maps require plain objects or Map instances");
	}

	return encodeValue;
}

function isPlainObject(value: object): value is CBORObject {
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

export class CBORReader {
	constructor(
		public data: Uint8Array,
		private readonly options: DecodeOptions = {},
	) {}

	// Suspend only for missing bytes so semantic handlers and completed items run once.
	*read<T>(read: (data: Uint8Array) => T): Generator<IncompleteCBOR, T, void> {
		while (true) {
			try {
				return read(this.data);
			} catch (error) {
				if (!(error instanceof IncompleteCBOR)) {
					throw error;
				}
				yield error;
			}
		}
	}

	*isBreak(offset: number): Generator<IncompleteCBOR, boolean, void> {
		const { majorType, additionalInfo } = yield* this.read((data) => parseCBORHeader(data, offset));
		return (majorType | additionalInfo) === BREAK;
	}

	*readValue(offset: number): ReadResult<CBORIO> {
		const { majorType, additionalInfo } = yield* this.read((data) => parseCBORHeader(data, offset));
		switch (majorType) {
			case Major.Simple:
				return yield* this.read((data) => decodeSimple(data, offset, additionalInfo));
			case Major.Unsigned:
			case Major.Negative:
			case Major.Tag:
				return yield* this.readNumberOrTag(majorType, additionalInfo, offset);
			default:
				return yield* this.readContainer(majorType, additionalInfo, offset);
		}
	}

	private *readNumberOrTag(
		majorType: number,
		additionalInfo: number,
		offset: number,
	): ReadResult<CBORIO> {
		const { argument, headerSize } = yield* this.read((data) =>
			decodeArgument(data, offset, additionalInfo),
		);
		const nextOffset = offset + headerSize;
		if (majorType === Major.Tag) {
			const payload = yield* this.readValue(nextOffset);
			return {
				value: decodeTag(argument, payload.value, this.options),
				nextOffset: payload.nextOffset,
			};
		}
		return {
			value: majorType === Major.Negative ? decodeNegativeInteger(argument) : argument,
			nextOffset,
		};
	}

	private *readContainer(
		majorType: number,
		additionalInfo: number,
		offset: number,
	): ReadResult<CBORIO> {
		const header =
			additionalInfo === INDEFINITE_LENGTH
				? { length: undefined, headerSize: 1 }
				: yield* this.read((data) => decodeLength(data, offset, additionalInfo));
		const bodyOffset = offset + header.headerSize;
		switch (majorType) {
			case Major.Text:
			case Major.Bytes:
				return yield* decodeString(majorType, header.length, bodyOffset, this);
			case Major.Array:
				return yield* decodeArray(header.length, bodyOffset, this);
			case Major.Map:
				return yield* decodeMap(header.length, bodyOffset, this);
			default:
				throw new Error(`Unsupported major type: ${majorType >> 5}`);
		}
	}
}

function decodeTag(tag: number | bigint, value: CBORIO, { tagHandlers }: DecodeOptions): CBORIO {
	const handler = tagHandlers?.get(tag) ?? tagHandlers?.get(BigInt(tag));
	if (handler !== undefined) {
		return handler(value);
	}
	switch (tag) {
		case 0:
		case 1:
			return decodeDate(tag, value);
		case 2:
		case 3:
			return decodeBignum(tag, value);
		default:
			return decodeTypedArray(tag, value) ?? new CBORTag(tag, value);
	}
}

export function readComplete<T>(result: ReadResult<T>): Decoded<T> {
	const step = result.next();
	if (!step.done) {
		throw step.value;
	}
	return step.value;
}
