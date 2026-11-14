/**
 * Represents the parsed CBOR header information
 */
export interface CBORHeader {
	majorType: number;
	additionalInfo: number;
}

export class IncompleteCBOR extends Error {}

/**
 * Parses the first byte of CBOR data to extract major type and additional info
 */
export function parseCBORHeader(data: Uint8Array, offset: number = 0): CBORHeader {
	if (offset >= data.length) {
		throw new IncompleteCBOR("Insufficient data to parse CBOR header");
	}

	const firstByte = data[offset];
	const majorType = firstByte & 0xe0; // Extract major type (top 3 bits)
	const additionalInfo = firstByte & 0x1f; // Extract additional info (bottom 5 bits)

	return { majorType, additionalInfo };
}

/**
 * Creates a properly aligned DataView for reading multi-byte values
 */
export function createDataView(data: Uint8Array, offset: number, size: number): DataView {
	if (offset + size > data.length) {
		throw new IncompleteCBOR(
			`Insufficient data: need ${size} bytes at offset ${offset}, but only ${data.length - offset} available`,
		);
	}
	return new DataView(data.buffer, data.byteOffset + offset, size);
}
