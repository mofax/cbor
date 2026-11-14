# cbor-ts

A lightweight, zero-dependency CBOR (Concise Binary Object Representation) encoder/decoder library for TypeScript and
JavaScript.

## Features

- 🚀 **Zero dependencies** - Pure TypeScript implementation
- 🔄 **Encode and decode** - Bidirectional conversion between supported JavaScript values and CBOR
- 📦 **Comprehensive data type support**:
  - Numbers (safe integers and floating-point values)
  - Strings (UTF-8 text strings)
  - Binary data (Uint8Array byte strings)
  - Booleans and null values
  - Date objects (with semantic tagging)
  - Arrays (with nesting support)
  - Plain objects (encoded as string-keyed CBOR maps)
- 🎯 **CBOR interoperability** - Supports a subset of RFC 8949
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

### `CBOR.pack(value: CBORIO): Uint8Array`

Encodes a JavaScript value into CBOR binary format.

**Parameters:**

- `value` is a string, number, boolean, null, Date, Uint8Array, array, or plain object. Arrays and objects can contain
  any supported value.

**Returns:** `Uint8Array` - The CBOR-encoded binary data

**Example:**

```ts
const binary = CBOR.pack({ message: "Hello", count: 42 });
```

### `CBOR.unpack(data: Uint8Array): CBORIO`

Decodes exactly one CBOR item. Empty input, truncated items, and trailing bytes raise errors.

**Parameters:**

- `data` contains the CBOR item.

**Returns:** The decoded JavaScript value

**Example:**

```ts
const value = CBOR.unpack(binaryData);
```

## Supported Data Types

| JavaScript Type    | CBOR Major Type            | Notes                                                                    |
| ------------------ | -------------------------- | ------------------------------------------------------------------------ |
| `number` (integer) | 0 (unsigned), 1 (negative) | JavaScript safe-integer range (−2⁵³ + 1 to 2⁵³ − 1)                      |
| `number` (float)   | 7 (floating-point)         | Encodes finite values as float64. Decodes float16, float32, and float64. |
| `string`           | 3 (text string)            | UTF-8 encoded                                                            |
| `Uint8Array`       | 2 (byte string)            | Binary data, preserves bytes                                             |
| `boolean`          | 7 (simple values)          | `true` (21), `false` (20)                                                |
| `null`             | 7 (simple value 22)        | JavaScript null                                                          |
| `Date`             | 6 (semantic tag) + payload | Encodes tag 1 in epoch seconds. Decodes tags 0 and 1.                    |
| `Array`            | 4 (array)                  | Supports nested arrays                                                   |
| Plain object       | 5 (map)                    | String keys, supports nesting                                            |

`Map` instances and custom tagged values are unsupported and raise errors.

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

This library implements the subset of [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html) listed under Supported
Data Types. Strings, arrays, and maps use definite lengths. Indefinite-length items, non-string map keys, integers
outside the safe-integer range, and tags other than dates are unsupported.

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please see [AGENTS.md](AGENTS.md) (Repository Guidelines) for coding style, testing, and PR
conventions before submitting a Pull Request.
