import { Major } from "../common/common.js";

export function encodeFloat64(value: number): Uint8Array {
	const result = new Uint8Array(9);
	result[0] = Major.Simple | 27;
	new DataView(result.buffer, 1).setFloat64(0, value);
	return result;
}
