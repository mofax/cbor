# Repository Guidelines

## Project Structure & Module Organization

- `sources/main.ts`: Library entry exporting `CBOR`.
- `sources/common/*`: Core utilities (parsing, headers, bytes, codec helpers).
- `sources/types/*`: Type‑specific encode/decode logic (numbers, strings, maps, arrays, dates, etc.).
- `sources/tests/*.test.ts`: Bun test suites.
- `specs/`: Reserved for protocol notes or future spec docs.

## Build, Test, and Development Commands

- `bun install` — install dependencies.
- `bun test` — run all tests (Bun test runner).
  - Examples: `bun test sources/tests/strings.test.ts`, `bun test --coverage`.
- `bun run fmt` — format with Deno (`deno fmt --use-tabs --line-width=120`).
- No build step is required; the library targets ESNext ESM and is consumed by bundlers directly.

## Coding Style & Naming Conventions

- Language: TypeScript (strict mode, ESM, no emit in repo).
- Formatting: Tabs for indentation; 120‑char line width; run `bun run fmt` before commits.
- Files: lowercase `.ts` (e.g., `common.ts`, `float64.ts`, `parser.ts`); tests end with `.test.ts`.
- Exports: Prefer named exports; avoid default exports.
- Runtime: Zero dependencies; avoid Node‑only APIs (prefer `Uint8Array`, standard TypedArray/DOM APIs).

## Testing Guidelines

- Framework: Bun (`import { describe, test, expect } from "bun:test"`).
- Location: Add tests under `sources/tests/` with `name.test.ts`.
- Coverage: Aim to cover round‑trip encode/decode and edge cases (bounds, empty inputs, malformed headers).
- Reference: When useful, compare bytes to `cbor2.encode` in tests (see existing number tests).

## Commit & Pull Request Guidelines

- Commits: Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`). Keep subjects short and imperative.
- PRs: Include a clear description, rationale, linked issues, and test coverage. Show before/after byte examples where
  relevant.
- Checks: Ensure `bun test` and `bun run fmt` pass.

## Security & Compatibility Tips

- Use `Uint8Array` for binary data; do not rely on `Buffer`.
- Validate lengths and indices when parsing; handle empty or malformed input defensively.
- Keep modules small, pure, and side‑effect free for browser and Node compatibility.
