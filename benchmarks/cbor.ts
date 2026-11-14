import { deepStrictEqual } from "node:assert/strict";
import { parseArgs } from "node:util";
import { Encoder, isNativeAccelerationEnabled } from "cbor-x";
import cborXPackage from "cbor-x/package.json";
import { bench, do_not_optimize, group, run, summary } from "mitata";
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
	group(`${name} / encode`, () => {
		summary(() => {
			bench("cbor-ts", () => do_not_optimize(CBOR.pack(value))).baseline();
			bench("cbor-x", () => do_not_optimize(cborX.encode(value)));
		});
	});
	group(`${name} / decode`, () => {
		summary(() => {
			bench("cbor-ts", () => do_not_optimize(CBOR.unpack(cborTsBytes))).baseline();
			bench("cbor-x", () => do_not_optimize(cborX.decode(cborXDecodeInput)));
		});
	});

	return { fixture: name, "cbor-ts bytes": cborTsBytes.length, "cbor-x bytes": cborXBytes.length };
});

console.log(
	`Bun ${Bun.version} · cbor-x ${cborXPackage.version} · native string decoding ${isNativeAccelerationEnabled ? "on" : "off"}`,
);
console.table(byteSizes);

if (values.verify) {
	console.log("Both decoders reproduced every selected fixture from both encoders.");
} else {
	await run({ throw: true });
}
