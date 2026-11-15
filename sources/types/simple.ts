import { Major } from "../common/common.js";
import type { ByteWriter } from "../common/writer.js";

export class CBORSimple {
	constructor(public readonly code: number) {}
}

export function writeSimple(writer: ByteWriter, code: number): void {
	if (!Number.isInteger(code) || code < 0 || code > 255 || (code >= 24 && code < 32)) {
		throw new RangeError(`Invalid CBOR simple value: ${code}`);
	}
	if (code < 24) {
		writer.writeByte(Major.Simple | code);
	} else {
		writer.writeByte(Major.Simple | 24);
		writer.writeByte(code);
	}
}

export function readSimple(code: number): boolean | null | undefined | CBORSimple {
	switch (code) {
		case 20:
		case 21:
			return code === 21;
		case 22:
			return null;
		case 23:
			return undefined;
		default:
			return new CBORSimple(code);
	}
}

export function readExtendedSimple(code: number): CBORSimple {
	if (code < 32) {
		throw new Error(`Invalid CBOR simple value: ${code}`);
	}
	return new CBORSimple(code);
}
