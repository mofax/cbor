# mcbor

A lightweight CBOR (Concise Binary Object Representation) encoder library for
modern C++.

## Features

- Typescript
- Zero dependencies
- Supports all major CBOR data types:
  - Integers (unsigned/signed)
  - Byte strings and text strings
  - Arrays and maps
  - Tags
  - Simple values (true, false, null, undefined)
  - Floating point numbers

```ts
const a = CBOR.pack(false); // simple 20
const b = CBOR.unpack(a); // false
const c = CBOR.pack(null); // simple 22
const d = CBOR.unpack(c); // null
const e = CBOR.pack(2n ** 70n); // tag 2 + bstr
const f = CBOR.unpack(e); // 2n ** 70n (bigint)
const g = CBOR.pack(-1n - (2n ** 80n)); // tag 3 + bstr
const h = CBOR.unpack(g); // same bigint
const i = CBOR.pack(2n ** 63n - 1n); // major 0, uint64
const j = CBOR.unpack(i); // bigint (outside JS safe), exact
const k = CBOR.pack(true);
const l = CBOR.unpack(k); // true
```

## Usage
