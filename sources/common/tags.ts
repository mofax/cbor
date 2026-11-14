import type { CBORIO } from "./codec.js";
import { Major, MAX_U64 } from "./common.js";
import { encodeLength } from "./length.js";

export class CBORTag {
	constructor(
		public readonly tag: number | bigint,
		public readonly value: CBORIO,
	) {}
}

export function encodeTag(tag: number | bigint): Uint8Array {
	if (typeof tag !== "bigint" && !Number.isSafeInteger(tag)) {
		throw new RangeError("Tag numbers must be safe integers or bigints");
	}
	if (tag < 0 || tag > MAX_U64) {
		throw new RangeError("Tag is outside the unsigned 64-bit range");
	}
	return encodeLength(tag, Major.Tag);
}
