import { joinIndefinite } from "../common/bytes.js";
import { Major } from "../common/common.js";
import { encodeLength } from "../common/length.js";

export function encodeBytes(value: Uint8Array, indefinite = false): Uint8Array {
	if (indefinite) {
		return joinIndefinite(Major.Bytes, value.length === 0 ? [] : [encodeBytes(value)]);
	}
	const header = encodeLength(value.length, Major.Bytes);
	const result = new Uint8Array(header.length + value.length);
	result.set(header);
	result.set(value, header.length);
	return result;
}
