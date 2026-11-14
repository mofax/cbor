import { Major } from "../common/common.js";
import type { ByteWriter } from "../common/writer.js";
import { writeNumber } from "./number.js";

const ISO_STRING_TAG = 0;
const EPOCH_TAG = 1;

export function writeDate(writer: ByteWriter, date: Date, deterministic: boolean): void {
	const milliseconds = date.getTime();
	if (!Number.isFinite(milliseconds)) {
		throw new Error("Invalid Date object");
	}

	writer.writeByte(Major.Tag | EPOCH_TAG);
	writeNumber(writer, milliseconds / 1000, deterministic);
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
