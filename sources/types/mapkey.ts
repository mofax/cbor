import type { CBORIO } from "../common/codec.js";
import { CBORTag } from "../common/tags.js";
import { CBORSimple } from "./simple.js";

export function mapKeyIdentity(value: CBORIO): string {
	if (typeof value === "string") {
		return JSON.stringify(value);
	}
	if (typeof value === "bigint") {
		return `bigint(${value})`;
	}
	if (value === null || typeof value !== "object") {
		return String(value);
	}
	return objectKeyIdentity(value);
}

function objectKeyIdentity(
	value: Exclude<CBORIO, string | bigint | number | boolean | null | undefined>,
): string {
	if (value instanceof CBORTag) {
		return `tag(${value.tag},${mapKeyIdentity(value.value)})`;
	}
	if (value instanceof CBORSimple) {
		return `simple(${value.code})`;
	}
	if (value instanceof Date) {
		return `date(${value.getTime()})`;
	}
	if (ArrayBuffer.isView(value)) {
		const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
		return `${value.constructor.name}(${bytes.join(",")})`;
	}
	if (Array.isArray(value)) {
		return `[${value.map(mapKeyIdentity).join(",")}]`;
	}
	const entries = value instanceof Map ? Array.from(value.entries()) : Object.entries(value);
	return `{${entries
		.map(([key, item]) => `${mapKeyIdentity(key)}:${mapKeyIdentity(item)}`)
		.sort()
		.join(",")}}`;
}
