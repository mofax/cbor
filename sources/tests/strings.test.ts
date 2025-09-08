import { describe, expect, test } from "bun:test";
import { encode } from "cbor2";
import { CBOR } from "../main";

describe("strings", () => {
	test("empty string", () => {
		const str1 = CBOR.pack("");
		const str2 = encode("");
		expect(str1).toEqual(str2);

		const decode1 = CBOR.unpack(str1);
		expect(decode1).toBe("");
	});

	test("short string", () => {
		const str1 = CBOR.pack("hello");
		const str2 = encode("hello");
		expect(str1).toEqual(str2);

		const decode1 = CBOR.unpack(str1);
		expect(decode1).toBe("hello");
	});

	test("longer string", () => {
		const str1 = CBOR.pack("The quick brown fox jumps over the lazy dog");
		const str2 = encode("The quick brown fox jumps over the lazy dog");
		expect(str1).toEqual(str2);

		const decode1 = CBOR.unpack(str1);
		expect(decode1).toBe("The quick brown fox jumps over the lazy dog");
	});

	test("unicode string", () => {
		const str1 = CBOR.pack("こんにちは世界"); // "Hello, World" in Japanese
		const str2 = encode("こんにちは世界");
		expect(str1).toEqual(str2);

		const decode1 = CBOR.unpack(str1);
		expect(decode1).toBe("こんにちは世界");
	});

	test("emoji string", () => {
		const str1 = CBOR.pack("😀🚀🌟");
		const str2 = encode("😀🚀🌟");
		expect(str1).toEqual(str2);

		const decode1 = CBOR.unpack(str1);
		expect(decode1).toBe("😀🚀🌟");
	});

	test("very long string", () => {
		const longStr = "a".repeat(1000); // String of 1000 'a' characters
		const str1 = CBOR.pack(longStr);
		const str2 = encode(longStr);
		expect(str1).toEqual(str2);

		const decode1 = CBOR.unpack(str1);
		expect(decode1).toBe(longStr);
	});
});
