import type { Decoded } from "../common/codec.js";
import { joinChunks } from "../common/bytes.js";
import { Major, MAX_U64 } from "../common/common.js";
import { encodeLength } from "../common/length.js";
import { createDataView } from "../common/parser.js";
import { encodeTag } from "../common/tags.js";
import { encodeBytes } from "./bytes.js";
import { encodeFloat64 } from "./float64.js";

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

export function encodeBigInt(value: bigint): Uint8Array {
	const negative = value < 0n;
	const magnitude = negative ? -1n - value : value;
	if (magnitude <= MAX_U64) {
		return encodeLength(magnitude, negative ? Major.Negative : Major.Unsigned);
	}

	const hex = magnitude.toString(16);
	const bytes = new Uint8Array(Math.ceil(hex.length / 2));
	const padded = hex.padStart(bytes.length * 2, "0");
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(padded.slice(i * 2, i * 2 + 2), 16);
	}
	return joinChunks([encodeTag(negative ? 3 : 2), encodeBytes(bytes)]);
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
	switch (additionalInfo) {
		case 25: {
			const bits = createDataView(data, offset + 1, 2).getUint16(0);
			return { value: decodeFloat16(bits), nextOffset: offset + 3 };
		}
		case 26: {
			const value = createDataView(data, offset + 1, 4).getFloat32(0);
			return { value, nextOffset: offset + 5 };
		}
		case 27: {
			const value = createDataView(data, offset + 1, 8).getFloat64(0);
			return { value, nextOffset: offset + 9 };
		}
		default:
			throw new Error(`Unsupported simple value with additional info: ${additionalInfo}`);
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
