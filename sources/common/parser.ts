export class IncompleteCBOR extends Error {}

/**
 * Creates a properly aligned DataView for reading multi-byte values
 */
export function createDataView(data: Uint8Array, offset: number, size: number): DataView {
	requireBytes(data, offset, size);
	return new DataView(data.buffer, data.byteOffset + offset, size);
}

export function requireBytes(data: Uint8Array, offset: number, size: number): void {
	if (offset + size > data.length) {
		throw new IncompleteCBOR(
			`Insufficient data: need ${size} bytes at offset ${offset}, but only ${data.length - offset} available`,
		);
	}
}
