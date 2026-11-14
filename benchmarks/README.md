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
reproduce the input from both encoders. The opening table reports encoded sizes in bytes. Mitata reports latency per
operation and relative speed within each pair. Lower latency is better.

The suite calls `CBOR.pack` and `CBOR.unpack` from the local checkout. It configures `cbor-x` to disable record
extensions, use compact plain-map headers and untagged byte strings, and copy decoded byte strings. Text-keyed maps
decode as objects, while the mixed-key fixture decodes as a JavaScript `Map`. The comparison covers this configuration
and these fixtures. [cbor-x options](https://github.com/kriszyp/cbor-x#options)

The runner prints the Bun and `cbor-x` versions and whether the optional native string decoder loaded. To measure the
JavaScript decoder on the same machine, run the suite again with that addon disabled.

```sh
CBOR_NATIVE_ACCELERATION_DISABLED=true bun run --cwd benchmarks bench
```
