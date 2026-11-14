import { BREAK, INDEFINITE_LENGTH } from "./common.js";

export function setUint64(view: DataView, offset: number, v: bigint) {
	// big-endian
	for (let i = 7; i >= 0; i--) {
		view.setUint8(offset + (7 - i), Number((v >> BigInt(8 * i)) & 0xffn));
	}
}

export function getUint64(view: DataView, offset: number): bigint {
	// big-endian
	let result = 0n;
	for (let i = 0; i < 8; i++) {
		result = (result << 8n) | BigInt(view.getUint8(offset + i));
	}
	return result;
}

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
