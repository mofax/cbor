import { type CBORIO, CBORReader, type DecodeOptions, type ReadResult } from "./codec.js";
import type { IncompleteCBOR } from "./parser.js";

export async function* unpackStream(
	chunks: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
	options?: DecodeOptions,
): AsyncGenerator<CBORIO> {
	let buffer = new Uint8Array(0);
	const reader = new CBORReader(buffer, options);
	let item: ReadResult<CBORIO> | undefined;
	let incomplete: IncompleteCBOR | undefined;
	for await (const chunk of chunks) {
		if (chunk.length === 0) {
			continue;
		}
		const length = reader.data.length + chunk.length;
		if (length > buffer.length) {
			buffer = new Uint8Array(Math.max(length, buffer.length * 2));
		}
		if (reader.data.buffer !== buffer.buffer || reader.data.byteOffset !== 0) {
			buffer.set(reader.data);
		}
		buffer.set(chunk, reader.data.length);
		reader.data = buffer.subarray(0, length);

		while (reader.data.length > 0) {
			item ??= reader.readValue(0);
			const result = item.next();
			if (!result.done) {
				incomplete = result.value;
				break;
			}
			item = undefined;
			incomplete = undefined;
			reader.data = reader.data.subarray(result.value.nextOffset);
			yield result.value.value;
		}
	}
	if (incomplete) {
		throw incomplete;
	}
}
