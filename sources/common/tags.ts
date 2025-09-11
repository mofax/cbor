import type { CBORObject, CBORTaggable } from "./codec";

export function isTaggable(value: CBORTaggable | CBORObject): value is CBORTaggable {
	if (!value || (value.__is_cbor_taggable__ !== true && typeof value.__custom_tag__ !== "number")) return false;
	if (typeof value.toCBOR !== "function") return false;
	return true;
}
