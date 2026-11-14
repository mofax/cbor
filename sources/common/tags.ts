import { Major } from "./common.js";
import { encodeLength } from "./length.js";

export function encodeTag(tag: number): Uint8Array {
	if (!Number.isSafeInteger(tag) || tag < 0) {
		throw new Error("Tag must be a non-negative safe integer");
	}
	return encodeLength(tag, Major.Tag);
}
