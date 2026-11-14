import type { CBORIO, CBORMap, CBORObject } from "../common/codec.js";
import { CBORTag } from "../common/tags.js";
import { CBORSimple } from "./simple.js";

export class DecodedMap {
	private readonly object: CBORObject = {};
	private readonly textKeys: string[] = [];
	private map?: CBORMap;
	private objectKeys?: Set<string>;

	checkKey(key: CBORIO): void {
		if (this.hasKey(key)) {
			throw new Error("Duplicate CBOR map key");
		}
	}

	set(key: CBORIO, value: CBORIO): void {
		if (this.map) {
			this.map.set(key, value);
		} else if (typeof key !== "string") {
			const entries: CBORMap = new Map();
			for (const textKey of this.textKeys) {
				entries.set(textKey, this.object[textKey]);
			}
			entries.set(key, value);
			this.map = entries;
		} else {
			this.textKeys.push(key);
			if (key in this.object) {
				Object.defineProperty(this.object, key, {
					value,
					writable: true,
					enumerable: true,
					configurable: true,
				});
			} else {
				this.object[key] = value;
			}
		}
	}

	value(): CBORMap | CBORObject {
		return this.map ?? this.object;
	}

	private hasKey(key: CBORIO): boolean {
		if (key !== null && typeof key === "object") {
			const identities = (this.objectKeys ??= new Set());
			const identity = mapKeyIdentity(key);
			if (identities.has(identity)) {
				return true;
			}
			identities.add(identity);
			return false;
		}
		return this.map
			? this.map.has(key)
			: typeof key === "string" && Object.hasOwn(this.object, key);
	}
}

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
