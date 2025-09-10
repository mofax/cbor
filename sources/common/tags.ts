import { Major } from "./common";
import { DIRECT_ENCODING_MAX, UINT8_ADDITIONAL_DATA, UINT8_MAX } from "./length";

/**
 * Encodes a CBOR tag header.
 */
export function encodeTag(tag: number): Uint8Array {
	if (tag < 0) {
		throw new Error("Tag must be non-negative");
	}

	if (tag <= DIRECT_ENCODING_MAX) {
		return new Uint8Array([Major.Tag | tag]);
	} else if (tag <= UINT8_MAX) {
		return new Uint8Array([Major.Tag | UINT8_ADDITIONAL_DATA, tag]);
	} else {
		throw new Error("Tags larger than 255 are not supported yet");
	}
}
