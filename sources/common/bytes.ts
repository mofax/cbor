import { BREAK, INDEFINITE_LENGTH } from "./common.js";

export function joinChunks(chunks: readonly Uint8Array[]): Uint8Array {
	const result = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
}
export function joinIndefinite(majorType: number, chunks: readonly Uint8Array[]): Uint8Array {
	return joinChunks([
		Uint8Array.of(majorType | INDEFINITE_LENGTH),
		...chunks,
		Uint8Array.of(BREAK),
	]);
}

export function compareBytes(left: Uint8Array, right: Uint8Array): number {
	for (let i = 0; i < Math.min(left.length, right.length); i++) {
		if (left[i] !== right[i]) {
			return left[i] - right[i];
		}
	}
	return left.length - right.length;
}
