import type { Decoded } from "../common/codec.js";
import { Major } from "../common/common.js";
import { createDataView } from "../common/parser.js";
import { decodeFloat } from "./number.js";

export class CBORSimple {
	constructor(public readonly code: number) {}
}

export function encodeBoolean(value: boolean): Uint8Array {
	return new Uint8Array([Major.Simple | (value ? 21 : 20)]);
}

export function encodeNull(): Uint8Array {
	return new Uint8Array([Major.Simple | 22]);
}

export function encodeSimple(code: number): Uint8Array {
	if (!Number.isInteger(code) || code < 0 || code > 255 || (code >= 24 && code < 32)) {
		throw new RangeError(`Invalid CBOR simple value: ${code}`);
	}
	return code < 24 ? Uint8Array.of(Major.Simple | code) : Uint8Array.of(Major.Simple | 24, code);
}

export function decodeSimple(
	data: Uint8Array,
	offset: number,
	additionalInfo: number,
): Decoded<boolean | null | undefined | CBORSimple | number> {
	const nextOffset = offset + 1;
	switch (additionalInfo) {
		case 20:
		case 21:
			return { value: additionalInfo === 21, nextOffset };
		case 22:
			return { value: null, nextOffset };
		case 23:
			return { value: undefined, nextOffset };
		case 24: {
			const code = createDataView(data, nextOffset, 1).getUint8(0);
			if (code < 32) {
				throw new Error(`Invalid CBOR simple value: ${code}`);
			}
			return { value: new CBORSimple(code), nextOffset: nextOffset + 1 };
		}
		default:
			return additionalInfo < 20
				? { value: new CBORSimple(additionalInfo), nextOffset }
				: decodeFloat(data, offset, additionalInfo);
	}
}
