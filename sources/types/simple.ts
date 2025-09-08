import { Major } from "../common/common";
import { parseCBORHeader, validateMajorType } from "../common/parser";

// CBOR simple values (major type 7)
const SIMPLE_FALSE = 20;
const SIMPLE_TRUE = 21;
const SIMPLE_NULL = 22;

export function encodeBoolean(value: boolean): Uint8Array {
	const additionalInfo = value ? SIMPLE_TRUE : SIMPLE_FALSE;
	return new Uint8Array([Major.Simple | additionalInfo]);
}

export function decodeBoolean(data: Uint8Array): boolean {
	const { majorType, additionalInfo } = parseCBORHeader(data, 0);
	validateMajorType(majorType, Major.Simple, "boolean");

	if (additionalInfo === SIMPLE_FALSE) {
		return false;
	} else if (additionalInfo === SIMPLE_TRUE) {
		return true;
	} else {
		throw new Error(`Invalid additional info for boolean: ${additionalInfo}`);
	}
}

export function encodeNull(): Uint8Array {
	return new Uint8Array([Major.Simple | SIMPLE_NULL]);
}

export function decodeNull(data: Uint8Array): null {
	const { majorType, additionalInfo } = parseCBORHeader(data, 0);
	validateMajorType(majorType, Major.Simple, "null");

	if (additionalInfo === SIMPLE_NULL) {
		return null;
	} else {
		throw new Error(`Invalid additional info for null: ${additionalInfo}`);
	}
}

export function isSimpleValue(data: Uint8Array, offset: number = 0): boolean {
	if (offset >= data.length) {
		return false;
	}

	const firstByte = data[offset];
	const majorType = firstByte & 0xe0;
	return majorType === Major.Simple;
}

export function decodeSimpleValue(data: Uint8Array): boolean | null {
	const { majorType, additionalInfo } = parseCBORHeader(data, 0);
	validateMajorType(majorType, Major.Simple, "simple value");

	switch (additionalInfo) {
		case SIMPLE_FALSE:
			return false;
		case SIMPLE_TRUE:
			return true;
		case SIMPLE_NULL:
			return null;
		default:
			throw new Error(
				`Unsupported simple value with additional info: ${additionalInfo}`,
			);
	}
}
