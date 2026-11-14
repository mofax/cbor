import { joinChunks, joinIndefinite } from "../common/bytes.js";
import type { CBORReader, ReadResult } from "../common/codec.js";
import { INDEFINITE_LENGTH, Major } from "../common/common.js";
import { decodeLength, encodeLength } from "../common/length.js";
import { IncompleteCBOR, parseCBORHeader } from "../common/parser.js";

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export function encodeString(value: string, indefinite = false): Uint8Array {
	if (indefinite) {
		return joinIndefinite(Major.Text, value.length === 0 ? [] : [encodeString(value)]);
	}
	const bytes = utf8Encoder.encode(value);
	const header = encodeLength(bytes.length, Major.Text);
	const result = new Uint8Array(header.length + bytes.length);
	result.set(header);
	result.set(bytes, header.length);
	return result;
}

export function* decodeString(
	major: typeof Major.Text | typeof Major.Bytes,
	length: number | undefined,
	offset: number,
	reader: CBORReader,
): ReadResult<string | Uint8Array> {
	const readPayload = (data: Uint8Array, start: number, size: number) => {
		if (size > data.length - start) {
			throw new IncompleteCBOR(`Insufficient data for string content at offset ${start}`);
		}
		const payload = data.subarray(start, start + size);
		return major === Major.Text ? utf8Decoder.decode(payload) : new Uint8Array(payload);
	};

	if (length !== undefined) {
		const value = yield* reader.read((data) => readPayload(data, offset, length));
		return { value, nextOffset: offset + length };
	}

	const text: string[] = [];
	const bytes: Uint8Array[] = [];
	while (!(yield* reader.isBreak(offset))) {
		const header = yield* reader.read((data) => parseCBORHeader(data, offset));
		if (header.majorType !== major || header.additionalInfo === INDEFINITE_LENGTH) {
			throw new Error("Indefinite-length strings require definite chunks of the same type");
		}
		const chunk = yield* reader.read((data) => decodeLength(data, offset, header.additionalInfo));
		offset += chunk.headerSize;
		const payload = yield* reader.read((data) => readPayload(data, offset, chunk.length));
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
