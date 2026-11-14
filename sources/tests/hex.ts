export function bytesFromHex(hex: string): Uint8Array {
	return Uint8Array.from(hex.match(/../g) ?? [], (byte) => Number.parseInt(byte, 16));
}
