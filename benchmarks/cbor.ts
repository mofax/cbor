import { deepStrictEqual } from "node:assert/strict";
import { parseArgs, styleText } from "node:util";
import { Encoder, isNativeAccelerationEnabled } from "cbor-x";
import cborXPackage from "cbor-x/package.json";
import { bench, do_not_optimize, run } from "mitata";
import { CBOR } from "../sources/main.js";
import { fixtures } from "./fixtures.js";

const { values } = parseArgs({
	options: {
		filter: { type: "string", default: "" },
		verify: { type: "boolean" },
		help: { type: "boolean" },
	},
});

if (values.help) {
	console.log("Usage: bun run --cwd benchmarks bench [--filter <fixture name>] [--verify]");
	process.exit(0);
}

const selected = fixtures.filter(({ name }) =>
	name.toLowerCase().includes(values.filter.toLowerCase()),
);
if (selected.length === 0) {
	throw new Error(
		`No fixtures match "${values.filter}". Available fixtures: ${fixtures.map(({ name }) => name).join(", ")}`,
	);
}

const byteSizes = selected.map(({ name, value, mapsAsObjects = true }) => {
	const cborX = new Encoder({
		useRecords: false,
		mapsAsObjects,
		variableMapSize: true,
		tagUint8Array: false,
		copyBuffers: true,
	});
	const cborTsBytes = CBOR.pack(value);
	const cborXBytes = Uint8Array.from(cborX.encode(value));

	// Verify each encoder's output with both decoders before measuring either library.
	for (const [producer, bytes] of [
		["cbor-ts", cborTsBytes],
		["cbor-x", cborXBytes],
	] as const) {
		deepStrictEqual(CBOR.unpack(bytes), value, `${name}: cbor-ts decoding ${producer} output`);
		deepStrictEqual(
			cborX.decode(bytes.slice()),
			value,
			`${name}: cbor-x decoding ${producer} output`,
		);
	}

	// Separate input views keep cbor-x's cached DataView local to that benchmark.
	const cborXDecodeInput = cborTsBytes.slice();
	bench(`${name} / encode / cbor-ts`, () => do_not_optimize(CBOR.pack(value)));
	bench(`${name} / encode / cbor-x`, () => do_not_optimize(cborX.encode(value)));
	bench(`${name} / decode / cbor-ts`, () => do_not_optimize(CBOR.unpack(cborTsBytes)));
	bench(`${name} / decode / cbor-x`, () => do_not_optimize(cborX.decode(cborXDecodeInput)));

	return { fixture: name, "cbor-ts bytes": cborTsBytes.length, "cbor-x bytes": cborXBytes.length };
});

console.log(
	`Bun ${Bun.version} · cbor-x ${cborXPackage.version} · native string decoding ${isNativeAccelerationEnabled ? "on" : "off"}`,
);
console.table(byteSizes);

if (values.verify) {
	console.log("Both decoders reproduced every selected fixture from both encoders.");
} else {
	const { benchmarks } = await run({ format: "quiet", throw: true });
	const results = new Map(
		benchmarks.flatMap(({ runs }) =>
			runs.map(({ name, stats, error }) => {
				if (!stats) {
					throw error;
				}
				return [name, stats] as const;
			}),
		),
	);

	console.log("\nLatency (ns/op)");
	console.table(
		selected.flatMap(({ name }) =>
			["encode", "decode"].map((operation) => {
				const cborTs = results.get(`${name} / ${operation} / cbor-ts`);
				const cborX = results.get(`${name} / ${operation} / cbor-x`);
				if (!cborTs || !cborX) {
					throw new Error(`Missing benchmark results for ${name} / ${operation}`);
				}
				return {
					fixture: name,
					operation,
					"cbor-ts p20 / p50 / p90": formatLatencies(cborTs),
					"cbor-x p20 / p50 / p90": formatLatencies(cborX),
					"Faster at p50": compareMedianLatency(cborTs.p50, cborX.p50),
				};
			}),
		),
	);
}

function formatLatencies({ samples, p50 }: { samples: readonly number[]; p50: number }): string {
	return [percentile(samples, 0.2), p50, percentile(samples, 0.9)]
		.map((latency) => latency.toFixed(2))
		.join(" / ");
}

function compareMedianLatency(cborTs: number, cborX: number): string {
	if (cborTs === cborX) {
		return "Tie";
	}
	const faster = cborTs < cborX ? styleText("cyan", "cbor-ts") : styleText("yellow", "cbor-x");
	const ratio = Math.max(cborTs, cborX) / Math.min(cborTs, cborX);
	const speedup = ratio < 1.01 ? "<1.01×" : `${ratio.toFixed(2)}×`;
	return `${faster} ${speedup}`;
}

function percentile(sortedSamples: readonly number[], fraction: number): number {
	// Mitata sorts the samples and uses this index for its built-in percentiles.
	return sortedSamples[Math.floor(fraction * (sortedSamples.length - 1))];
}
