import { deepStrictEqual } from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import type { CBOR, CBORIO, EncodeOptions } from "../sources/main.js";

const { values } = parseArgs({
	options: { module: { type: "string" }, filter: { type: "string" } },
});
const { CBOR: codec }: { CBOR: typeof CBOR } = await import(
	values.module ? pathToFileURL(resolve(values.module)).href : "../sources/main.ts"
);

type Benchmark = { name: string; run: () => unknown; iterations: number; streaming?: boolean };
const cases: Benchmark[] = [];
let result: unknown;

function roundTrip(
	name: string,
	value: CBORIO,
	iterations: number,
	options?: EncodeOptions,
	verifyBytes = false,
): void {
	if (
		values.filter &&
		!`${name} pack`.includes(values.filter) &&
		!`${name} unpack`.includes(values.filter)
	) {
		return;
	}
	const encoded = codec.pack(value, options);
	const decoded = codec.unpack(encoded);
	if (verifyBytes) {
		deepStrictEqual(codec.pack(decoded, options), encoded);
	} else {
		deepStrictEqual(decoded, value);
	}
	cases.push(
		{ name: `${name} pack`, run: () => codec.pack(value, options), iterations },
		{ name: `${name} unpack`, run: () => codec.unpack(encoded), iterations },
	);
}

for (const value of [new Uint16Array(524288), new Float32Array(262144), new Float64Array(131072)]) {
	value.fill(3);
	roundTrip(`1 MiB ${value.constructor.name}`, value, 24);
}
for (const size of [16, 4096, 16384, 65536]) {
	roundTrip(`${size} B bignum`, BigInt(`0x${"a5".repeat(size)}`), size < 4096 ? 3000 : 4);
}
for (const depth of [32, 128, 256]) {
	let value: CBORIO = 1;
	for (let index = 0; index < depth; index++) {
		value = new Map<CBORIO, CBORIO>([[value, index & 15]]);
	}
	roundTrip(`depth ${depth} composite map keys`, value, depth <= 32 ? 100 : 12, undefined, true);
}
for (const depth of [32, 128]) {
	let value: CBORIO = 1;
	for (let index = 0; index < depth; index++) {
		value = new Map<CBORIO, CBORIO>([
			[value, index & 15],
			["side", null],
		]);
	}
	roundTrip(`depth ${depth} multi-entry composite map keys`, value, 15, undefined, true);
}
roundTrip(
	"200 same-shape objects",
	Array.from({ length: 200 }, (_, id) => ({
		id,
		name: `sensor-${id}`,
		group: id % 4,
		active: id % 3 !== 0,
		reading: 20 + id / 256,
	})),
	100,
);
roundTrip("short ASCII", "sensor-281", 12000);
roundTrip("long ASCII", "The sensor is online and reporting normally. ".repeat(64), 2000);
roundTrip("multilingual UTF-8", "Nairobi • Montréal • 東京 • قياسات • 🌡️\n".repeat(64), 1000);
roundTrip(
	"200 medium UTF-8 strings",
	Array<string>(200).fill("Nairobi • Montréal • 東京 • قياسات • 🌡️"),
	350,
);

const bytes = Uint8Array.from({ length: 1024 * 1024 }, (_, index) => index & 255);
roundTrip("1 MiB definite byte string", bytes, 45);
roundTrip("1 MiB indefinite byte string", bytes, 45, { indefinite: true });

const wire = codec.pack(bytes.subarray(0, 65536));
for (const width of [wire.length, 1024, 64]) {
	const chunks = Array.from({ length: Math.ceil(wire.length / width) }, (_, index) =>
		wire.subarray(index * width, (index + 1) * width),
	);
	const run = async () => {
		const values: CBORIO[] = [];
		for await (const item of codec.unpackStream(chunks)) {
			values.push(item);
		}
		return values;
	};
	// eslint-disable-next-line no-await-in-loop -- Verify each stream before registering its timed case.
	deepStrictEqual(await run(), [bytes.subarray(0, 65536)]);
	cases.push({
		name: `64 KiB stream at ${width} B per chunk`,
		run,
		iterations: 35,
		streaming: true,
	});
}

const selected = cases.filter(({ name }) => !values.filter || name.includes(values.filter));
if (selected.length === 0) {
	throw new Error("No matching benchmarks");
}
console.log(
	`${process.versions.bun ? `Bun ${process.versions.bun}` : `Node ${process.version}`} / ${process.arch}`,
);
const rows = [];
for (const { name, run, iterations, streaming } of selected) {
	const samples = [];
	for (let batch = 0; batch < 6; batch++) {
		const start = performance.now();
		if (streaming) {
			for (let index = 0; index < iterations; index++) {
				// eslint-disable-next-line no-await-in-loop -- Measure consecutive operations without overlap.
				result = await run();
			}
		} else {
			for (let index = 0; index < iterations; index++) {
				result = run();
			}
		}
		if (batch > 0) {
			samples.push(((performance.now() - start) * 1000) / iterations);
		}
	}
	samples.sort((left, right) => left - right);
	rows.push({ name, "median µs/op": samples[2].toFixed(3) });
}
console.table(rows);
if (result === undefined) {
	throw new Error("Benchmark did not produce an output");
}
