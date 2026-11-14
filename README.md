# cbor-ts

A lightweight, zero-dependency CBOR (Concise Binary Object Representation) encoder/decoder library for TypeScript and
JavaScript.

## Features

- 🚀 **Zero dependencies** - Pure TypeScript implementation
- 🔄 **Encode and decode** - Bidirectional conversion between supported JavaScript values and CBOR
- 📦 **Comprehensive data type support**:
  - Numbers and exact integers using `bigint`
  - Strings (UTF-8 text strings)
  - Binary data and tagged typed arrays
  - Booleans, null, undefined, and application simple values
  - Date objects and custom semantic tags
  - Arrays (with nesting support)
  - Plain objects and maps with arbitrary supported keys
- 🎯 **CBOR interoperability** - Supports indefinite-length items, deterministic encoding, and CBOR sequences
- ✨ **TypeScript declarations** - Recursive types for supported values
- 🧪 **Well tested** - Comprehensive test suite with reference implementation comparison

## Installation

```bash
# Using Bun (recommended)
bun add cbor-ts

# Using npm
npm install cbor-ts

# Using pnpm
pnpm add cbor-ts
```

## Quick Start

```ts
import { CBOR } from "cbor-ts";

// Basic values
const packed = CBOR.pack("hello world");
const unpacked = CBOR.unpack(packed); // "hello world"

// Numbers
const num = CBOR.pack(42);
const float = CBOR.pack(3.14159);

// Booleans and null
const bool = CBOR.pack(true);
const nil = CBOR.pack(null);

// Dates
const date = CBOR.pack(new Date());
const restoredDate = CBOR.unpack(date); // Date object

// Binary data (Uint8Array)
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello" in bytes
const packedBytes = CBOR.pack(binaryData);
const unpackedBytes = CBOR.unpack(packedBytes); // Uint8Array

// Complex structures
const data = {
	name: "Alice",
	age: 30,
	active: true,
	scores: [85, 92, 78],
	avatar: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), // Binary image data
	metadata: {
		created: new Date(),
		tags: ["user", "premium"],
	},
};

const encoded = CBOR.pack(data);
const decoded = CBOR.unpack(encoded);
```

## API Reference

### `CBOR.pack(value: CBORIO, options?: EncodeOptions): Uint8Array`

Encodes a JavaScript value into CBOR binary format.

**Parameters:**

- `value` can be any of the supported types below, including nested values.
- `options.indefinite` opts into indefinite lengths for strings, byte strings, arrays, and maps.
- `options.deterministic` uses definite lengths, sorts map keys by their encoded bytes, and uses the shortest float
  width that preserves each value. Setting both options to `true` raises an error.

**Returns:** `Uint8Array` - The CBOR-encoded binary data

**Example:**

```ts
const binary = CBOR.pack({ message: "Hello", count: 42 });
```

### `CBOR.unpack(data: Uint8Array, options?: DecodeOptions): CBORIO`

Decodes exactly one CBOR item. Empty input, truncated items, and trailing bytes raise errors.

**Parameters:**

- `data` contains the CBOR item. Both definite and indefinite lengths are accepted.
- `options.tagHandlers` maps tag numbers to functions that receive the decoded payload and return a CBOR value.
  Handlers apply only to the current decode call and take precedence over built-in tag handling.

**Returns:** The decoded JavaScript value

**Example:**

```ts
const value = CBOR.unpack(binaryData);
```

### Semantic tags and simple values

- `CBOR.tag(tag, value)` wraps a payload with an unsigned 64-bit tag number. Supply a `bigint` for tag numbers
  above the JavaScript safe-integer range. Decoding a tag without a handler returns a wrapper you can pack again.
- `CBOR.simple(code)` wraps a simple-value code. Codes 0–19 and 32–255 decode as wrappers. Codes 20–23 decode as
  `false`, `true`, `null`, and `undefined`.

### CBOR sequences

- `CBOR.packSequence(items, options?)` encodes an iterable as consecutive CBOR items.
- `CBOR.unpackSequence(data, options?)` returns all consecutive items in a byte array.
- `CBOR.unpackStream(chunks, options?)` accepts an iterable or async iterable of byte chunks and yields each item
  as soon as it is complete. The stream errors if it ends partway through an item.

## Supported Data Types

| JavaScript type                | CBOR representation      | Notes                                                                        |
| ------------------------------ | ------------------------ | ---------------------------------------------------------------------------- |
| `number` (integer)             | Unsigned or negative int | Supports the JavaScript safe-integer range                                   |
| `bigint`                       | Integer or bignum tag    | Basic integers decode as `number` when safe. Bignum tags decode as `bigint`. |
| `number` (float)               | Floating point           | Supports float16, float32, float64, signed zero, NaN, and infinities         |
| `string`                       | Text string              | UTF-8 encoded                                                                |
| `Uint8Array`                   | Byte string              | Preserves the bytes in the view                                              |
| Other ES2022 typed arrays      | Typed-array tag          | Accepts both byte orders                                                     |
| `boolean`, `null`, `undefined` | Simple value             | Codes 20–23                                                                  |
| `CBOR.simple(code)`            | Simple value             | Wraps application simple values                                              |
| `Date`                         | Semantic tag             | Encodes tag 1 in epoch seconds. Decodes tags 0 and 1.                        |
| `CBOR.tag(tag, value)`         | Semantic tag             | Wraps a custom tag and payload                                               |
| `Array`                        | Array                    | Supports nesting                                                             |
| Plain object, `Map`            | Map                      | Maps with only text keys decode as objects. Other maps decode as `Map`.      |

## Advanced Usage

### Working with Binary Data

```ts
import { CBOR } from "cbor-ts";

// Encode raw binary data
const binaryData = new Uint8Array([
	0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64,
]);
const encoded = CBOR.pack(binaryData);
const decoded = CBOR.unpack(encoded); // Returns Uint8Array

console.log(decoded instanceof Uint8Array); // true
console.log(Array.from(decoded)); // [72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]

// Binary data in complex structures
const document = {
	id: "doc123",
	content: "Hello World",
	thumbnail: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), // JPEG header bytes
	attachments: [
		{
			name: "data.bin",
			data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
		},
	],
};

const packedDoc = CBOR.pack(document);
const unpackedDoc = CBOR.unpack(packedDoc) as typeof document;

console.log(unpackedDoc.thumbnail instanceof Uint8Array); // true
console.log(unpackedDoc.attachments[0].data instanceof Uint8Array); // true
```

### Complex Nested Structures

```ts
import { CBOR } from "cbor-ts";

// Encode complex nested data with binary content
const complexData = {
	users: [
		{
			id: 1,
			name: "Alice",
			lastSeen: new Date(),
			avatar: new Uint8Array([1, 2, 3]),
		},
		{
			id: 2,
			name: "Bob",
			lastSeen: new Date(),
			avatar: new Uint8Array([4, 5, 6]),
		},
	],
	settings: {
		theme: "dark",
		notifications: true,
		limits: [10, 50, 100],
		encryptionKey: new Uint8Array(32), // 256-bit key
	},
};

const encoded = CBOR.pack(complexData);
console.log(`Encoded size: ${encoded.length} bytes`);

const decoded = CBOR.unpack(encoded) as typeof complexData;
console.log(decoded.users[0].lastSeen instanceof Date); // true
console.log(decoded.users[0].avatar instanceof Uint8Array); // true
console.log(decoded.settings.encryptionKey instanceof Uint8Array); // true
```

### Error Handling

```ts
try {
	CBOR.unpack(Uint8Array.of(0x18)); // A truncated integer
} catch (error) {
	console.error("Failed to decode CBOR:", error);
}
```

## Compatibility

- **Node.js** 24 and later. The npm package includes ESM JavaScript and TypeScript declarations.
- **Browsers** with ES2022 support and a bundler or native ES module loading.
- **TypeScript** 5.0 and later.

## Development

```bash
# Clone the repository
git clone https://github.com/mofax/cbor.git
cd cbor

# Install dependencies
bun install

# Run tests
bun test

# Build JavaScript and type declarations
bun run build

# Format code
bun run fmt
```

## Standards Compliance

The supported types and encoding options are based on [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html).
Sequences follow [RFC 8742](https://www.rfc-editor.org/rfc/rfc8742.html), and typed-array tags follow
[RFC 8746](https://www.rfc-editor.org/rfc/rfc8746.html).

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please see [AGENTS.md](AGENTS.md) (Repository Guidelines) for coding style, testing, and PR
conventions before submitting a Pull Request.
