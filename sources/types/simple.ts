import { Major } from "../common/common.js";

export function encodeBoolean(value: boolean): Uint8Array {
	return new Uint8Array([Major.Simple | (value ? 21 : 20)]);
}

export function encodeNull(): Uint8Array {
	return new Uint8Array([Major.Simple | 22]);
}
