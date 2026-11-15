# CBOR benchmarks

Run from the repository root with Bun.

```sh
bun install --cwd benchmarks --frozen-lockfile
bun run --cwd benchmarks bench
```

Run a subset by fixture name, or check interoperability and encoded sizes without timing.

```sh
bun run --cwd benchmarks bench --filter "telemetry"
bun run --cwd benchmarks bench --verify
```

The suite uses eight fixed fixtures covering a small integer, an array of numbers, ASCII and multilingual UTF-8 text,
nested telemetry with a date, an array of 200 same-shape objects, a mixed-key map, and a 64 KiB byte string.

Each encoder receives the same JavaScript value. Each decoder repeatedly reads a prebuilt view of the same CBOR bytes,
so the decode timings include only that operation and allow warm decoder caches. Before timing, both decoders must
reproduce the input from both encoders. The opening table reports encoded sizes in bytes. The timing table puts both
libraries on the same row for each fixture and operation, with p20, p50 (median), and p90 latency in nanoseconds per
operation. The final column names the library with the lower p50 and shows the slower p50 divided by the faster p50.

The suite calls `CBOR.pack` and `CBOR.unpack` from the local checkout. It configures `cbor-x` to disable record
extensions, use compact plain-map headers and untagged byte strings, and copy decoded byte strings. Text-keyed maps
decode as objects, while the mixed-key fixture decodes as a JavaScript `Map`. The comparison covers this configuration
and these fixtures. [cbor-x options](https://github.com/kriszyp/cbor-x#options)

The runner prints the Bun and `cbor-x` versions and whether the optional native string decoder loaded. To measure the
JavaScript decoder on the same machine, run the suite again with that addon disabled.

```sh
CBOR_NATIVE_ACCELERATION_DISABLED=true bun run --cwd benchmarks bench
```

## Library performance checks

Run the focused suite to measure typed arrays, bignums, nested composite map keys, text, byte strings, and fragmented
streams. Each fixture verifies its round trip before timing. The suite reports the median of five timed batches after
one warm-up batch, with inputs and stream chunks prepared outside the timed loops.

```sh
bun benchmarks/perf.ts
bun benchmarks/perf.ts --filter "composite map keys"
bun run build
node benchmarks/perf.ts --module dist/main.js
```

Pass `--module` the entry point of a separately built baseline to compare revisions using the same fixtures and runtime.
