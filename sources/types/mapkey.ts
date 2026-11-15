import type { CBORIO, CBORMap, CBORObject } from "../common/codec.js";
import { CBORTag } from "../common/tags.js";
import { CBORSimple } from "./simple.js";

export class DecodedMap {
	private readonly object: CBORObject = {};
	private textKeys?: string[];
	private map?: CBORMap;
	private objectKeys?: Set<string | number>;

	checkKey(key: CBORIO, index?: MapKeyIndex): void {
		if (this.hasKey(key, index)) {
			throw new Error("Duplicate CBOR map key");
		}
	}

	set(key: CBORIO, value: CBORIO): void {
		if (this.map) {
			this.map.set(key, value);
		} else if (typeof key !== "string") {
			const entries: CBORMap = new Map();
			for (const textKey of this.textKeys ?? Object.keys(this.object)) {
				entries.set(textKey, this.object[textKey]);
			}
			entries.set(key, value);
			this.map = entries;
			this.textKeys = undefined;
		} else {
			this.rememberTextKey(key);
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

	private rememberTextKey(key: string): void {
		// Own strings enumerate in insertion order until an array index is inserted.
		const first = key.charCodeAt(0);
		if (this.textKeys === undefined && first >= 48 && first <= 57 && key.length <= 10) {
			const index = Number(key);
			if (index < 0xffffffff && Number.isInteger(index) && String(index) === key) {
				this.textKeys = Object.keys(this.object);
			}
		}
		this.textKeys?.push(key);
	}

	private hasKey(key: CBORIO, index: MapKeyIndex | undefined): boolean {
		if (key !== null && typeof key === "object") {
			const identities = (this.objectKeys ??= new Set());
			const identity = index ? index.identity(key) : mapKeyIdentity(key);
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

// Intern immediate children by ID so a nested key never embeds the whole subtree in its signature.
// This index is scoped to one decoded item and used only for objects created by the decoder.
export class MapKeyIndex {
	private readonly objects = new WeakMap<object, number>();
	private readonly signatures = new Map<string, number>();

	identity(value: CBORIO): number {
		if (value === null || typeof value !== "object") {
			return this.intern(`v${mapKeyIdentity(value)}`);
		}
		const known = this.objects.get(value);
		if (known !== undefined) {
			return known;
		}
		const id = this.intern(this.signature(value));
		this.objects.set(value, id);
		return id;
	}

	private signature(value: ObjectKey): string {
		if (value instanceof CBORTag) {
			return `t${value.tag},${this.identity(value.value)}`;
		}
		if (Array.isArray(value)) {
			return `a${value.map((item) => this.identity(item)).join(",")}`;
		}
		if (value instanceof CBORSimple || value instanceof Date || ArrayBuffer.isView(value)) {
			return `v${objectKeyIdentity(value)}`;
		}
		const pairs: string[] = [];
		for (const [key, item] of value instanceof Map ? value : Object.entries(value)) {
			pairs.push(`${this.identity(key)}:${this.identity(item)}`);
		}
		return `m${pairs.sort().join(",")}`;
	}

	private intern(signature: string): number {
		const known = this.signatures.get(signature);
		if (known !== undefined) {
			return known;
		}
		const id = this.signatures.size;
		this.signatures.set(signature, id);
		return id;
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

type ObjectKey = Exclude<CBORIO, string | bigint | number | boolean | null | undefined>;

function objectKeyIdentity(value: ObjectKey): string {
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
