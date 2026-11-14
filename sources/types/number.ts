import type { Decoded } from "../common/codec.js";
import { Major, MAX_U64 } from "../common/common.js";
import { encodeLength } from "../common/length.js";
import { createDataView } from "../common/parser.js";
import { writeByteString } from "./bytes.js";
import { encodeFloat64 } from "./float64.js";
import type { ByteWriter } from "../common/writer.js";

export function encodeNumber(value: number, deterministic = false): Uint8Array {
	if (!Number.isFinite(value)) {
		return encodePreferredFloat(value);
	}
	if (!Number.isInteger(value) || Object.is(value, -0)) {
		return deterministic ? encodePreferredFloat(value) : encodeFloat64(value);
	}
	if (!Number.isSafeInteger(value)) {
		throw new Error(`Integer ${value} exceeds JavaScript's safe integer range`);
	}

	return value < 0 ? encodeLength(-1 - value, Major.Negative) : encodeLength(value, Major.Unsigned);
}

export function writeNumber(writer: ByteWriter, value: number, deterministic: boolean): void {
	if (Number.isSafeInteger(value) && (value !== 0 || 1 / value > 0)) {
		if (value < 0) {
			writer.writeArgument(Major.Negative, -1 - value);
		} else {
			writer.writeArgument(Major.Unsigned, value);
		}
	} else if (deterministic || !Number.isFinite(value) || (Number.isInteger(value) && value !== 0)) {
		writer.writeBytes(encodeNumber(value, deterministic));
	} else {
		writer.writeFloat64(value);
	}
}

export function writeBigInt(writer: ByteWriter, value: bigint): void {
	const negative = value < 0n;
	const magnitude = negative ? -1n - value : value;
	if (magnitude <= MAX_U64) {
		writer.writeBigArgument(negative ? Major.Negative : Major.Unsigned, magnitude);
		return;
	}

	const hex = magnitude.toString(16);
	const bytes = new Uint8Array(Math.ceil(hex.length / 2));
	const padded = hex.padStart(bytes.length * 2, "0");
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(padded.slice(i * 2, i * 2 + 2), 16);
	}
	writer.writeByte(Major.Tag | (negative ? 3 : 2));
	writeByteString(writer, bytes, false);
}

export function decodeBignum(tag: 2 | 3, value: unknown): bigint {
	if (!(value instanceof Uint8Array)) {
		throw new Error(`Bignum tag ${tag} requires a byte string`);
	}
	let magnitude = 0n;
	for (const byte of value) {
		magnitude = (magnitude << 8n) | BigInt(byte);
	}
	return tag === 2 ? magnitude : -1n - magnitude;
}

export function decodeNegativeInteger(argument: number | bigint): number | bigint {
	if (typeof argument === "bigint" || argument === Number.MAX_SAFE_INTEGER) {
		return -1n - BigInt(argument);
	}
	return -1 - argument;
}

export function encodePreferredFloat(value: number): Uint8Array {
	if (Number.isNaN(value)) {
		return Uint8Array.of(Major.Simple | 25, 0x7e, 0);
	}
	if (Math.fround(value) !== value) {
		return encodeFloat64(value);
	}

	const single = new Uint8Array(5);
	single[0] = Major.Simple | 26;
	const view = new DataView(single.buffer, 1);
	view.setFloat32(0, value);
	const half = exactHalfBits(value, view.getUint32(0));
	return half === undefined ? single : Uint8Array.of(Major.Simple | 25, half >> 8, half & 0xff);
}

function exactHalfBits(value: number, float32Bits: number): number | undefined {
	const sign = (float32Bits >>> 16) & 0x8000;
	const magnitude = Math.abs(value);
	if (magnitude === Infinity) {
		return sign | 0x7c00;
	}
	if (magnitude < 2 ** -14) {
		const fraction = magnitude * 2 ** 24;
		return Number.isInteger(fraction) ? sign | fraction : undefined;
	}
	if (magnitude <= 65504 && (float32Bits & 0x1fff) === 0) {
		const exponent = ((float32Bits >>> 23) & 0xff) - 112;
		return sign | (exponent << 10) | ((float32Bits >>> 13) & 0x3ff);
	}
	return undefined;
}

export function decodeFloat(
	data: Uint8Array,
	offset: number,
	additionalInfo: number,
): Decoded<number> {
	const size = floatSize(additionalInfo);
	return {
		value: readFloat(createDataView(data, offset + 1, size), 0, size),
		nextOffset: offset + 1 + size,
	};
}

export function floatSize(additionalInfo: number): number {
	if (additionalInfo < 25 || additionalInfo > 27) {
		throw new Error(`Unsupported simple value with additional info: ${additionalInfo}`);
	}
	return 1 << (additionalInfo - 24);
}

export function readFloat(view: DataView, offset: number, size: number): number {
	switch (size) {
		case 2:
			return decodeFloat16(view.getUint16(offset));
		case 4:
			return view.getFloat32(offset);
		default:
			return view.getFloat64(offset);
	}
}

function decodeFloat16(bits: number): number {
	const sign = bits & 0x8000 ? -1 : 1;
	const exponent = (bits >> 10) & 0x1f;
	const fraction = bits & 0x3ff;

	if (exponent === 0) {
		return sign * fraction * 2 ** -24;
	}
	if (exponent === 31) {
		return fraction === 0 ? sign * Infinity : NaN;
	}
	return sign * (1 + fraction / 1024) * 2 ** (exponent - 15);
}
