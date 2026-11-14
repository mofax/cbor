import { joinChunks, joinIndefinite } from "../common/bytes.js";
import type { CBORReader, ReadResult } from "../common/codec.js";
import { BREAK, INDEFINITE_LENGTH, Major } from "../common/common.js";
import { argumentSize, decodeLength, writeArgumentAt } from "../common/length.js";
import { IncompleteCBOR, parseCBORHeader } from "../common/parser.js";
import type { ByteWriter } from "../common/writer.js";

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

type StringMajor = typeof Major.Text | typeof Major.Bytes;

export function encodeString(value: string, indefinite = false): Uint8Array {
	if (indefinite) {
		return joinIndefinite(Major.Text, value.length === 0 ? [] : [encodeString(value)]);
	}
	const bytes = utf8Encoder.encode(value);
	const size = argumentSize(bytes.length);
	const result = new Uint8Array(size + bytes.length);
	writeArgumentAt(result, 0, Major.Text, bytes.length, size);
	result.set(bytes, size);
	return result;
}

export function writeText(writer: ByteWriter, value: string, indefinite: boolean): void {
	if (indefinite) {
		writer.writeByte(Major.Text | INDEFINITE_LENGTH);
	}
	if ((!indefinite || value.length > 0) && !writer.writeShortAscii(value, Major.Text)) {
		const bytes = utf8Encoder.encode(value);
		writer.writeArgument(Major.Text, bytes.length);
		writer.writeBytes(bytes);
	}
	if (indefinite) {
		writer.writeByte(BREAK);
	}
}

export function* decodeString(
	major: StringMajor,
	length: number | undefined,
	offset: number,
	reader: CBORReader,
): ReadResult<string | Uint8Array> {
	if (length !== undefined) {
		const value = yield* reader.read((data) => readStringPayload(data, major, offset, length));
		return { value, nextOffset: offset + length };
	}

	const text: string[] = [];
	const bytes: Uint8Array[] = [];
	while (!(yield* reader.isBreak(offset))) {
		const header = yield* reader.read((data) => parseCBORHeader(data, offset));
		checkStringChunk(major, header.majorType, header.additionalInfo);
		const chunk = yield* reader.read((data) => decodeLength(data, offset, header.additionalInfo));
		offset += chunk.headerSize;
		const payload = yield* reader.read((data) =>
			readStringPayload(data, major, offset, chunk.length),
		);
		if (typeof payload === "string") {
			text.push(payload);
		} else {
			bytes.push(payload);
		}
		offset += chunk.length;
	}
	return {
		value: major === Major.Text ? text.join("") : joinChunks(bytes),
		nextOffset: offset + 1,
	};
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
