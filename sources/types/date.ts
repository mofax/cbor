import { encodeTag } from "../common/tags.js";
import { encodeNumber } from "./number.js";

const ISO_STRING_TAG = 0;
const EPOCH_TAG = 1;

export function encodeDate(date: Date, deterministic = false): Uint8Array {
	const milliseconds = date.getTime();
	if (!Number.isFinite(milliseconds)) {
		throw new Error("Invalid Date object");
	}

	const tag = encodeTag(EPOCH_TAG);
	const payload = encodeNumber(milliseconds / 1000, deterministic);
	const result = new Uint8Array(tag.length + payload.length);
	result.set(tag);
	result.set(payload, tag.length);
	return result;
}

export function decodeDate(tag: 0 | 1, value: unknown): Date {
	let date: Date;
	if (tag === ISO_STRING_TAG) {
		if (typeof value !== "string") {
			throw new Error("Date tag 0 requires a text string");
		}
		date = new Date(value);
	} else {
		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new Error("Date tag 1 requires a finite number");
		}
		// Scale the fractional part separately to avoid rounding twice at large timestamps.
		const seconds = Math.trunc(value);
		const milliseconds = seconds * 1000 + Math.round((value - seconds) * 1000);
		date = new Date(milliseconds);
	}

	if (!Number.isFinite(date.getTime())) {
		throw new Error("Invalid CBOR date");
	}
	return date;
}
