import { BREAK, INDEFINITE_LENGTH, Major } from "../common/common.js";
import { argumentSize, DIRECT_ENCODING_MAX, writeArgumentAt } from "../common/length.js";
import { IncompleteCBOR } from "../common/parser.js";
import type { ByteWriter } from "../common/writer.js";

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

type StringMajor = typeof Major.Text | typeof Major.Bytes;

export function encodeString(value: string, indefinite = false): Uint8Array {
	if (indefinite && value.length === 0) {
		return Uint8Array.of(Major.Text | INDEFINITE_LENGTH, BREAK);
	}
	const start = indefinite ? 1 : 0;
	if (value.length <= DIRECT_ENCODING_MAX) {
		const ascii = encodeShortAscii(value, start);
		if (ascii) {
			return ascii;
		}
	}
	const bytes = utf8Encoder.encode(value);
	const size = argumentSize(bytes.length);
	const result = new Uint8Array(size + bytes.length + start * 2);
	writeArgumentAt(result, start, Major.Text, bytes.length, size);
	result.set(bytes, start + size);
	if (indefinite) {
		result[0] = Major.Text | INDEFINITE_LENGTH;
		result[result.length - 1] = BREAK;
	}
	return result;
}

function encodeShortAscii(value: string, start: number): Uint8Array | undefined {
	for (let index = 0; index < value.length; index++) {
		if (value.charCodeAt(index) > 0x7f) {
			return undefined;
		}
	}
	const result = new Uint8Array(1 + value.length + start * 2);
	result[start] = Major.Text | value.length;
	for (let index = 0; index < value.length; index++) {
		result[start + 1 + index] = value.charCodeAt(index);
	}
	if (start !== 0) {
		result[0] = Major.Text | INDEFINITE_LENGTH;
		result[result.length - 1] = BREAK;
	}
	return result;
}

export function writeText(writer: ByteWriter, value: string, indefinite: boolean): void {
	if (indefinite) {
		writer.writeByte(Major.Text | INDEFINITE_LENGTH);
	}
	if (
		(!indefinite || value.length > 0) &&
		!writer.writeShortAscii(value, Major.Text) &&
		!(
			value.length > DIRECT_ENCODING_MAX &&
			writer.writeUtf8IntoSpareCapacity(value, Major.Text, utf8Encoder)
		)
	) {
		const bytes = utf8Encoder.encode(value);
		writer.writeArgument(Major.Text, bytes.length);
		writer.writeBytes(bytes);
	}
	if (indefinite) {
		writer.writeByte(BREAK);
	}
}

export function checkStringChunk(
	major: StringMajor,
	chunkMajor: number,
	additionalInfo: number,
): void {
	if (chunkMajor !== major || additionalInfo === INDEFINITE_LENGTH) {
		throw new Error("Indefinite-length strings require definite chunks of the same type");
	}
}

export function readStringPayload(
	data: Uint8Array,
	major: StringMajor,
	offset: number,
	size: number,
): string | Uint8Array {
	if (size > data.length - offset) {
		throw new IncompleteCBOR(`Insufficient data for string content at offset ${offset}`);
	}
	const end = offset + size;
	if (major === Major.Bytes) {
		return new Uint8Array(data.subarray(offset, end));
	}
	if (size <= 16) {
		let text = "";
		for (let index = offset; index < end; index++) {
			const byte = data[index];
			if (byte > 0x7f) {
				return utf8Decoder.decode(data.subarray(offset, end));
			}
			text += String.fromCharCode(byte);
		}
		return text;
	}
	return utf8Decoder.decode(data.subarray(offset, end));
}
