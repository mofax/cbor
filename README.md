# cbor-ts

A lightweight, zero-dependency CBOR (Concise Binary Object Representation) encoder/decoder library for TypeScript and
JavaScript.

## Features

- 🚀 **Zero dependencies** - Pure TypeScript implementation
- 🔄 **Full encode/decode support** - Bidirectional conversion between JS values and CBOR binary format
- 📦 **Comprehensive data type support**:
  - Numbers (integers, floats, including 64-bit values)
  - Strings (UTF-8 text strings)
  - Binary data (Uint8Array byte strings)
  - Booleans and null values
  - Date objects (with semantic tagging)
  - Arrays (with nesting support)
  - Objects/Maps (with nesting support)
- 🎯 **Spec compliant** - Follows RFC 8949 CBOR specification
- ✨ **Modern TypeScript** - Full type safety and modern ES2020+ features
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
	avatar: new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]), // Binary image data
	metadata: {
		created: new Date(),
		tags: ["user", "premium"],
	},
};

const encoded = CBOR.pack(data);
const decoded = CBOR.unpack(encoded);
```

## API Reference

### `CBOR.pack(value: any): Uint8Array`

Encodes a JavaScript value into CBOR binary format.

**Parameters:**

- `value` - The value to encode (string, number, boolean, null, Date, Uint8Array, Array, Object)

**Returns:** `Uint8Array` - The CBOR-encoded binary data

**Example:**

```ts
const binary = CBOR.pack({ message: "Hello", count: 42 });
```

### `CBOR.unpack(data: Uint8Array): any`

Decodes CBOR binary data back into a JavaScript value.

**Parameters:**

- `data` - The CBOR binary data to decode

**Returns:** The decoded JavaScript value

**Example:**

```ts
const value = CBOR.unpack(binaryData);
```

## Supported Data Types

| JavaScript Type    | CBOR Major Type            | Notes                         |
| ------------------ | -------------------------- | ----------------------------- |
| `number` (integer) | 0 (unsigned), 1 (negative) | Full 64-bit integer support   |
| `number` (float)   | 7 (float64)                | IEEE 754 double precision     |
| `string`           | 3 (text string)            | UTF-8 encoded                 |
| `Uint8Array`       | 2 (byte string)            | Binary data, preserves bytes  |
| `boolean`          | 7 (simple values)          | `true` (21), `false` (20)     |
| `null`             | 7 (simple value 22)        | JavaScript null               |
| `Date`             | 6 (semantic tag) + payload | Tag 1 (epoch timestamp)       |
| `Array`            | 4 (array)                  | Supports nested arrays        |
| `Object`           | 5 (map)                    | String keys, supports nesting |

## Advanced Usage

### Working with Binary Data

```ts
import { CBOR } from "cbor-ts";

// Encode raw binary data
const binaryData = new Uint8Array([
	0x48,
	0x65,
	0x6c,
	0x6c,
	0x6f,
	0x20,
	0x57,
	0x6f,
	0x72,
	0x6c,
	0x64,
]);
const encoded = CBOR.pack(binaryData);
const decoded = CBOR.unpack(encoded); // Returns Uint8Array

console.log(decoded instanceof Uint8Array); // true
console.log(Array.from(decoded)); // [72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]

// Binary data in complex structures
const document = {
	id: "doc123",
	content: "Hello World",
	thumbnail: new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header bytes
	attachments: [
		{
			name: "data.bin",
			data: new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]),
		},
	],
};

const packedDoc = CBOR.pack(document);
const unpackedDoc = CBOR.unpack(packedDoc);

console.log(unpackedDoc.thumbnail instanceof Uint8Array); // true
console.log(unpackedDoc.attachments[0].data instanceof Uint8Array); // true
```

### Complex Nested Structures

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

const decoded = CBOR.unpack(encoded);
console.log(decoded.users[0].lastSeen instanceof Date); // true
console.log(decoded.users[0].avatar instanceof Uint8Array); // true
console.log(decoded.settings.encryptionKey instanceof Uint8Array); // true
```

### Error Handling

```ts
try {
	const result = CBOR.unpack(invalidData);
} catch (error) {
	console.error("Failed to decode CBOR:", error.message);
}

// Encoding errors
try {
	CBOR.pack(Symbol("cannot-encode")); // Will throw
} catch (error) {
	console.error("Cannot encode value:", error.message);
}
```

## Performance Characteristics

- **Memory efficient**: encoding/decoding with minimal allocations
- **Speed optimized**: Fast path for common data types
- **Small footprint**: Zero dependencies, compact library size

## Compatibility

- **Node.js**: Runtimes compatible with NodeJS 16.x and above
- **Browsers**: Modern browsers with TypedArray support
- **TypeScript**: 5.0+

## Development

```bash
# Clone the repository
git clone https://github.com/mofax/cbor.git
cd cbor

# Install dependencies
bun install

# Run tests
bun test

# Format code
bun run fmt
```

## Standards Compliance

This library implements the CBOR specification as defined in:

- [RFC 8949: Concise Binary Object Representation (CBOR)](https://tools.ietf.org/rfc/rfc8949.html)

Supported CBOR features:

- All major types (0-7)
- Definite-length encoding for strings, arrays, and maps
- IEEE 754 floating-point numbers (float64)
- Semantic tagging for dates (tag 1)

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please see [AGENTS.md](AGENTS.md) (Repository Guidelines) for coding style, testing, and PR
conventions before submitting a Pull Request.
