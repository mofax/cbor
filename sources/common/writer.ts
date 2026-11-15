import {
	DIRECT_ENCODING_MAX,
	UINT8_ADDITIONAL_DATA,
	UINT8_MAX,
	UINT16_ADDITIONAL_DATA,
	UINT16_MAX,
	UINT32_ADDITIONAL_DATA,
	UINT32_MAX,
	UINT64_ADDITIONAL_DATA,
	argumentSize,
	writeArgumentAt,
} from "./length.js";

export class ByteWriter {
	private data = new Uint8Array(64);
	private dataView?: DataView;
	offset = 0;

	finish(exact: boolean): Uint8Array {
		if (this.offset === this.data.length) {
			return this.data;
		}
		return exact ? this.data.slice(0, this.offset) : this.data.subarray(0, this.offset);
	}

	writeByte(byte: number): void {
		this.reserve(1);
		this.data[this.offset++] = byte;
	}

	writeBytes(bytes: Uint8Array): void {
		this.reserve(bytes.length);
		this.data.set(bytes, this.offset);
		this.offset += bytes.length;
	}

	writeReversedBytes(bytes: Uint8Array, width: number): void {
		const target = this.reserveBytes(bytes.length);
		for (let start = 0; start < bytes.length; start += width) {
			for (let index = 0; index < width; index++) {
				target[start + index] = bytes[start + width - 1 - index];
			}
		}
	}

	reserveBytes(size: number): Uint8Array<ArrayBuffer> {
		this.reserve(size);
		const start = this.offset;
		this.offset += size;
		return this.data.subarray(start, this.offset);
	}

	writeShortAscii(text: string, major: number): boolean {
		const size = text.length;
		if (size > DIRECT_ENCODING_MAX) {
			return false;
		}
		this.reserve(size + 1);
		const start = this.offset + 1;
		for (let index = 0; index < size; index++) {
			const code = text.charCodeAt(index);
			if (code > 0x7f) {
				return false;
			}
			this.data[start + index] = code;
		}
		this.data[this.offset] = major | size;
		this.offset = start + size;
		return true;
	}

	writeUtf8IntoSpareCapacity(text: string, major: number, encoder: TextEncoder): boolean {
		const size = argumentSize(text.length);
		const start = this.offset + size;
		const maxBytes = text.length * 3;
		if (maxBytes > this.data.length - start || size !== argumentSize(maxBytes)) {
			return false;
		}
		// Both UTF-8 size bounds have the same argument width, so the payload stays in place.
		const { written } = encoder.encodeInto(text, this.data.subarray(start, start + maxBytes));
		this.writeArgument(major, written);
		this.offset += written;
		return true;
	}

	writeArgument(major: number, argument: number): void {
		if (argument <= DIRECT_ENCODING_MAX) {
			this.writeByte(major | argument);
		} else if (argument <= UINT8_MAX) {
			this.reserve(2);
			this.data[this.offset++] = major | UINT8_ADDITIONAL_DATA;
			this.data[this.offset++] = argument;
		} else if (argument <= UINT16_MAX) {
			this.reserve(3);
			this.data[this.offset++] = major | UINT16_ADDITIONAL_DATA;
			this.view.setUint16(this.offset, argument);
			this.offset += 2;
		} else if (argument <= UINT32_MAX) {
			this.reserve(5);
			this.data[this.offset++] = major | UINT32_ADDITIONAL_DATA;
			this.view.setUint32(this.offset, argument);
			this.offset += 4;
		} else {
			this.writeBigArgument(major, BigInt(argument));
		}
	}

	writeBigArgument(major: number, argument: bigint): void {
		if (argument <= UINT32_MAX) {
			this.writeArgument(major, Number(argument));
			return;
		}
		this.reserve(9);
		this.data[this.offset++] = major | UINT64_ADDITIONAL_DATA;
		this.view.setBigUint64(this.offset, argument);
		this.offset += 8;
	}

	writeFloat64(value: number): void {
		this.reserve(9);
		this.data[this.offset++] = 0xfb;
		this.view.setFloat64(this.offset, value);
		this.offset += 8;
	}

	updateArgument(major: number, start: number, previous: number, next: number): void {
		const oldSize = argumentSize(previous);
		const newSize = argumentSize(next);
		const extra = newSize - oldSize;
		if (extra !== 0) {
			this.reserve(extra);
			this.data.copyWithin(start + newSize, start + oldSize, this.offset);
			this.offset += extra;
		}
		writeArgumentAt(this.data, start, major, next, newSize);
	}

	wireKey(start: number): string {
		return byteIdentity(this.data, start, this.offset);
	}

	private get view(): DataView {
		return (this.dataView ??= new DataView(this.data.buffer));
	}

	private reserve(size: number): void {
		const required = this.offset + size;
		if (required > this.data.length) {
			const next = new Uint8Array(Math.max(required, this.data.length * 2));
			next.set(this.data.subarray(0, this.offset));
			this.data = next;
			this.dataView = undefined;
		}
	}
}

export function byteIdentity(bytes: Uint8Array, start = 0, end = bytes.length): string {
	if (end - start > 32) {
		return bytes.subarray(start, end).join(",");
	}
	// The prefix keeps the compact key space distinct from the decimal representation.
	let identity = ":";
	for (let index = start; index < end; index++) {
		identity += String.fromCharCode(bytes[index]);
	}
	return identity;
}
