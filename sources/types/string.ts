import { Major } from "../common/common.js";
import { encodeLength } from "../common/length.js";

const utf8Encoder = new TextEncoder();

export function encodeString(value: string): Uint8Array {
	const bytes = utf8Encoder.encode(value);
	const header = encodeLength(bytes.length, Major.Text);
	const result = new Uint8Array(header.length + bytes.length);
	result.set(header);
	result.set(bytes, header.length);
	return result;
}
