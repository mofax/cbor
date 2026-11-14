import { joinIndefinite } from "../common/bytes.js";
import { BREAK, INDEFINITE_LENGTH, Major } from "../common/common.js";
import { argumentSize, writeArgumentAt } from "../common/length.js";
import type { ByteWriter } from "../common/writer.js";

export function encodeBytes(value: Uint8Array, indefinite = false): Uint8Array {
	if (indefinite) {
		return joinIndefinite(Major.Bytes, value.length === 0 ? [] : [encodeBytes(value)]);
	}
	const size = argumentSize(value.length);
	const result = new Uint8Array(size + value.length);
	writeArgumentAt(result, 0, Major.Bytes, value.length, size);
	result.set(value, size);
	return result;
}

export function writeByteString(writer: ByteWriter, value: Uint8Array, indefinite: boolean): void {
	if (indefinite) {
		writer.writeByte(Major.Bytes | INDEFINITE_LENGTH);
	}
	if (!indefinite || value.length > 0) {
		writer.writeArgument(Major.Bytes, value.length);
		writer.writeBytes(value);
	}
	if (indefinite) {
		writer.writeByte(BREAK);
	}
}
