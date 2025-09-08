import { Major } from "../common/common";

export function encodeFloat64(n: number): Uint8Array {
	const out = new Uint8Array(1 + 8);
	out[0] = Major.Simple | 27;
	const view = new DataView(out.buffer, out.byteOffset + 1, 8);
	view.setFloat64(0, n, false);
	return out;
}

export function decodeFloat64(data: Uint8Array, offset: number): number {
	if (offset + 9 > data.length) {
		throw new Error("Insufficient data for float64");
	}

	const view = new DataView(data.buffer, data.byteOffset + offset + 1, 8);
	return view.getFloat64(0, false); // big-endian
}
