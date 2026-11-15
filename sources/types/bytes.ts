import { BREAK, INDEFINITE_LENGTH, Major } from "../common/common.js";
import { argumentSize, writeArgumentAt } from "../common/length.js";
import type { ByteWriter } from "../common/writer.js";

export function encodeBytes(value: Uint8Array, indefinite = false): Uint8Array {
	if (indefinite && value.length === 0) {
		return Uint8Array.of(Major.Bytes | INDEFINITE_LENGTH, BREAK);
	}
	const size = argumentSize(value.length);
	const start = indefinite ? 1 : 0;
	const result = new Uint8Array(size + value.length + start * 2);
	writeArgumentAt(result, start, Major.Bytes, value.length, size);
	result.set(value, start + size);
	if (indefinite) {
		result[0] = Major.Bytes | INDEFINITE_LENGTH;
		result[result.length - 1] = BREAK;
	}
	return result;
}

export function writeByteString(
	writer: ByteWriter,
	value: Uint8Array,
	indefinite: boolean,
	reverseWidth = 1,
): void {
	if (indefinite) {
		writer.writeByte(Major.Bytes | INDEFINITE_LENGTH);
	}
	if (!indefinite || value.length > 0) {
		writer.writeArgument(Major.Bytes, value.length);
		if (reverseWidth === 1) {
			writer.writeBytes(value);
		} else {
			writer.writeReversedBytes(value, reverseWidth);
		}
	}
	if (indefinite) {
		writer.writeByte(BREAK);
	}
}
