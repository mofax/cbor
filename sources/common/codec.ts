import { CBORTag } from "./tags.js";
import { decodeDate } from "../types/date.js";
import { decodeBignum } from "../types/number.js";
import type { CBORSimple } from "../types/simple.js";
import { type CBORTypedArray, decodeTypedArray } from "../types/typedarray.js";

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

export function decodeTag(
	tag: number | bigint,
	value: CBORIO,
	options: DecodeOptions | undefined,
	ownedBytes: boolean,
): CBORIO {
	const tagHandlers = options?.tagHandlers;
	if (tagHandlers) {
		const handler = tagHandlers.get(tag) ?? tagHandlers.get(BigInt(tag));
		if (handler !== undefined) {
			return handler(value);
		}
	}
	switch (tag) {
		case 0:
		case 1:
			return decodeDate(tag, value);
		case 2:
		case 3:
			return decodeBignum(tag, value);
		default:
			return decodeTypedArray(tag, value, ownedBytes) ?? new CBORTag(tag, value);
	}
}
