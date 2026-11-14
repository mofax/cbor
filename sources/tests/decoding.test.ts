import { describe, expect, test } from "bun:test";
import { CBOR, type CBORIO } from "../main";
import { bytesFromHex } from "./hex";

type TaggedValue = { tag: number | bigint; value: CBORIO | TaggedValue };
type TagOptions = { tagHandlers: ReadonlyMap<number | bigint, (value: CBORIO) => CBORIO> };
// Describe the proposed public APIs locally so the tests type-check before they exist.
const taggedCBOR = CBOR as unknown as {
	tag(tag: TaggedValue["tag"], value: TaggedValue["value"]): TaggedValue;
	pack(value: TaggedValue): Uint8Array;
	unpack(data: Uint8Array, options?: TagOptions): CBORIO | TaggedValue;
};
const indefinitePack = CBOR.pack as (value: CBORIO, options: { indefinite: true }) => Uint8Array;
const sequenceCBOR = CBOR as typeof CBOR & {
	packSequence(items: Iterable<CBORIO>): Uint8Array;
	unpackSequence(data: Uint8Array): CBORIO[];
	unpackStream(chunks: AsyncIterable<Uint8Array>): AsyncIterable<CBORIO>;
};

describe("Decoding definite-length data", () => {
	test("reads the next sibling after a nested value encoded with a wider header", () => {
		expect(CBOR.unpack(bytesFromHex("8281180102"))).toEqual([[1], 2]);
		expect(CBOR.unpack(bytesFromHex("82b8016161180102"))).toEqual([{ a: 1 }, 2]);
		expect(CBOR.unpack(bytesFromHex("82a2616181180161620203"))).toEqual([{ a: [1], b: 2 }, 3]);
	});

	test("accepts wide text and byte string headers", () => {
		const bytes = bytesFromHex("006b");
		const input = bytesFromHex("827b0000000000000001615b0000000000000002006b");
		expect(CBOR.unpack(input)).toEqual(["a", bytes]);
	});

	test("respects the bounds of a Uint8Array view", () => {
		const backing = bytesFromHex("0019010000");
		expect(CBOR.unpack(backing.subarray(1, 4))).toBe(256);
		expect(() => CBOR.unpack(backing.subarray(1, 3))).toThrow();
	});

	test("rejects empty input, truncation, and trailing data", () => {
		for (const hex of ["", "18", "63abcd", "42ab", "8181", "a16161", "c1", "f93e"]) {
			expect(() => CBOR.unpack(bytesFromHex(hex))).toThrow();
		}
		for (const hex of ["0102", "810102", "a000", "c10102"]) {
			expect(() => CBOR.unpack(bytesFromHex(hex))).toThrow("Unexpected trailing data");
		}
	});

	test("preserves an initial U+FEFF and rejects invalid UTF-8", () => {
		expect(CBOR.unpack(CBOR.pack("\uFEFFa"))).toBe("\uFEFFa");
		expect(() => CBOR.unpack(bytesFromHex("61ff"))).toThrow();
	});

	test("accepts float16 and float32, and preserves signed zero", () => {
		expect(CBOR.unpack(bytesFromHex("82f93800fa3fc00000"))).toEqual([0.5, 1.5]);
		expect(Object.is(CBOR.unpack(CBOR.pack(-0)), -0)).toBe(true);
	});
});

describe("Map and nested value handling", () => {
	test("supports byte strings at any depth", () => {
		const value = { items: [{ data: [new Uint8Array([1, 2])] }] } satisfies CBORIO;
		expect(CBOR.unpack(CBOR.pack(value))).toEqual(value);
	});

	test("keeps __proto__ as an own property on decoded objects", () => {
		const value = { ["__proto__"]: { a: 1 } };
		const decoded = CBOR.unpack(CBOR.pack(value)) as object;
		expect(Object.getPrototypeOf(decoded)).toBe(Object.prototype);
		expect(Object.hasOwn(decoded, "__proto__")).toBe(true);
		expect(decoded).toEqual(value);
	});

	test("rejects duplicate string map keys", () => {
		expect(() => CBOR.unpack(bytesFromHex("a2616101616102"))).toThrow("Duplicate CBOR map key");
	});
});

describe("Indefinite-length items", () => {
	test.each([
		["empty byte string", "5fff", Uint8Array.of()],
		["empty text string", "7fff", ""],
		["empty array", "9fff", []],
		["empty map", "bfff", {}],
		[
			"byte string with an empty chunk and an ff payload byte",
			"5f40410042ff01ff",
			Uint8Array.of(0, 255, 1),
		],
		["UTF-8 text split between code points", "7f62c3a96063e282acff", "é€"],
		["array with definite and indefinite children", "9f0181029f03ffff", [1, [2], [3]]],
		["map with an indefinite-length value", "bf61619f01ff616202ff", { a: [1], b: 2 }],
		["indefinite container followed by a sibling", "829fbf616101ffff02", [[{ a: 1 }], 2]],
	] satisfies [string, string, CBORIO][])("decodes %s", (_name, hex, value) => {
		expect(CBOR.unpack(bytesFromHex(hex))).toEqual(value);
	});

	test.each([
		["byte string", Uint8Array.of(0, 255), 0x5f],
		["text string", "é€", 0x7f],
		["array", [1, 2], 0x9f],
		["map", { a: 1 }, 0xbf],
	] satisfies [string, CBORIO, number][])(
		"can encode an indefinite-length %s explicitly",
		(_name, value, head) => {
			const encoded = indefinitePack(value, { indefinite: true });
			expect(encoded[0]).toBe(head);
			expect(encoded.at(-1)).toBe(0xff);
			expect(CBOR.unpack(encoded)).toEqual(value);
		},
	);

	test.each([
		["standalone break", "ff"],
		["break inside a definite-length array", "81ff"],
		["unterminated array", "9f01"],
		["unterminated byte string", "5f4100"],
		["map ending between a key and value", "bf6161ff"],
		["text chunk inside a byte string", "5f6161ff"],
		["byte string chunk inside a text string", "7f4161ff"],
		["nested indefinite byte chunk", "5f5f40ffff"],
		["nested indefinite text chunk", "7f7f60ffff"],
		["UTF-8 code point split across chunks", "7f61c361a9ff"],
		["trailing data after the break", "9fff01"],
	])("rejects %s", (_name, hex) => {
		expect(() => CBOR.unpack(bytesFromHex(hex))).toThrow();
	});
});

describe("Custom semantic tags", () => {
	const tag = 80_000;
	const encodedTag = "da00013880820102";

	test("encodes a custom tag around an array", () => {
		expect(taggedCBOR.pack(taggedCBOR.tag(tag, [1, 2]))).toEqual(bytesFromHex(encodedTag));
	});

	test("continues to encode objects with tag and value properties as maps", () => {
		const value = { tag, value: [1, 2] };
		const encoded = bytesFromHex("a2637461671a000138806576616c7565820102");
		expect(CBOR.pack(value)).toEqual(encoded);
		expect(CBOR.unpack(encoded)).toEqual(value);
	});

	test("preserves unhandled tags nested around known tags and retains the next sibling", () => {
		const encoded = bytesFromHex("82da00013880da0001388181c10102");
		const decoded = taggedCBOR.unpack(encoded);
		expect(decoded).toEqual([{ tag, value: { tag: 80_001, value: [new Date(1000)] } }, 2]);
		expect(CBOR.pack(decoded as CBORIO)).toEqual(encoded);
	});

	test("preserves tag numbers beyond the safe-integer range", () => {
		const tagNumber = 2n ** 53n + 1n;
		const encoded = bytesFromHex("db002000000000000180");
		expect(taggedCBOR.unpack(encoded)).toEqual({ tag: tagNumber, value: [] });
		expect(taggedCBOR.pack(taggedCBOR.tag(tagNumber, []))).toEqual(encoded);
	});

	test("uses handlers scoped to a single decode and still interprets dates", () => {
		const encoded = bytesFromHex(`82${encodedTag}c101`);
		const tagHandlers = new Map<number, (value: CBORIO) => CBORIO>([
			[tag, (value) => ({ coordinates: value })],
		]);
		expect(taggedCBOR.unpack(encoded, { tagHandlers })).toEqual([
			{ coordinates: [1, 2] },
			new Date(1000),
		]);
		expect(taggedCBOR.unpack(encoded)).toEqual([{ tag, value: [1, 2] }, new Date(1000)]);
	});

	test.each([
		["negative", -1],
		["fractional", 1.5],
		["unsafe number", 2 ** 53],
		["outside the uint64 range", 2n ** 64n],
	] as const)("rejects tag numbers that are %s", (_name, invalidTag) => {
		expect(taggedCBOR.tag).toBeFunction();
		expect(() => taggedCBOR.pack(taggedCBOR.tag(invalidTag, []))).toThrow();
	});

	test("rejects a tag with no payload", () => {
		expect(() => taggedCBOR.unpack(bytesFromHex("da00013880"))).toThrow();
	});
});

async function* chunksFrom(chunks: Iterable<Uint8Array>): AsyncIterable<Uint8Array> {
	yield* chunks;
}

async function collect(items: AsyncIterable<CBORIO>): Promise<CBORIO[]> {
	const values: CBORIO[] = [];
	for await (const value of items) {
		values.push(value);
	}
	return values;
}

describe("CBOR sequences (RFC 8742)", () => {
	const values = [1, "é", [2, 3], null] satisfies CBORIO[];
	const encoded = bytesFromHex("0162c3a9820203f6");

	test("encodes an iterable as concatenated top-level items", () => {
		expect(sequenceCBOR.packSequence(new Set(values))).toEqual(encoded);
		expect(sequenceCBOR.packSequence([1, 1])).toEqual(bytesFromHex("0101"));
	});

	test("decodes consecutive scalar and nested items from a bounded view", () => {
		const padded = Uint8Array.of(0xff, ...encoded, 0xff);
		expect(sequenceCBOR.unpackSequence(padded.subarray(1, -1))).toEqual(values);
	});

	test("represents an empty sequence with zero bytes", () => {
		expect(sequenceCBOR.packSequence([])).toEqual(Uint8Array.of());
		expect(sequenceCBOR.unpackSequence(Uint8Array.of())).toEqual([]);
	});

	test.each([
		["an incomplete final item", "0162c3"],
		["a stray break after a complete item", "01ff"],
	])("rejects a sequence containing %s", (_name, hex) => {
		expect(sequenceCBOR.unpackSequence).toBeFunction();
		expect(() => sequenceCBOR.unpackSequence(bytesFromHex(hex))).toThrow();
	});
});

describe("Incremental decoding", () => {
	const encoded = bytesFromHex("19010062c3a99f4200fffff6");
	const values = [256, "é", [Uint8Array.of(0, 255)], null];

	test("decodes a sequence split at every byte boundary, including empty chunks", async () => {
		const chunks = [
			Uint8Array.of(),
			...Array.from(encoded, (byte) => Uint8Array.of(byte)),
			Uint8Array.of(),
		];
		expect(await collect(sequenceCBOR.unpackStream(chunksFrom(chunks)))).toEqual(values);
	});

	test("calls a completed tag handler once when the next map entry spans chunks", async () => {
		let calls = 0;
		const tagHandlers = new Map([
			[
				100,
				(value: CBORIO) => {
					calls++;
					return value;
				},
			],
		]);
		const data = CBOR.pack({ first: CBOR.tag(100, 1), second: [2, 3] }, { indefinite: true });
		const chunks = Array.from(data, (byte) => Uint8Array.of(byte));
		expect(await collect(CBOR.unpackStream(chunks, { tagHandlers }))).toEqual([
			{ first: 1, second: [2, 3] },
		]);
		expect(calls).toBe(1);
	});

	test("yields a complete item before asking for the next chunk", async () => {
		let requestedNextChunk = false;
		async function* input() {
			yield bytesFromHex("01");
			requestedNextChunk = true;
			yield bytesFromHex("0162c3");
			yield bytesFromHex("a9");
		}
		const stream = sequenceCBOR.unpackStream(input())[Symbol.asyncIterator]();
		expect(await stream.next()).toEqual({ value: 1, done: false });
		expect(requestedNextChunk).toBe(false);
		expect(await stream.next()).toEqual({ value: 1, done: false });
		expect(await stream.next()).toEqual({ value: "é", done: false });
		expect((await stream.next()).done).toBe(true);
	});

	test("finishes an empty stream with no values", async () => {
		expect(await collect(sequenceCBOR.unpackStream(chunksFrom([])))).toEqual([]);
	});

	test("reports a partial final item when the stream ends", async () => {
		const chunks = chunksFrom([bytesFromHex("0162"), bytesFromHex("c3")]);
		const stream = sequenceCBOR.unpackStream(chunks)[Symbol.asyncIterator]();
		expect(await stream.next()).toEqual({ value: 1, done: false });
		await expect(stream.next()).rejects.toThrow();
	});

	test("rejects malformed input as soon as its bytes arrive", async () => {
		let requestedAnotherChunk = false;
		async function* input() {
			yield bytesFromHex("01ff");
			requestedAnotherChunk = true;
			yield bytesFromHex("02");
		}
		const stream = sequenceCBOR.unpackStream(input())[Symbol.asyncIterator]();
		expect(await stream.next()).toEqual({ value: 1, done: false });
		await expect(stream.next()).rejects.toThrow();
		expect(requestedAnotherChunk).toBe(false);
	});
});
