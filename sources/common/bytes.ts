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
