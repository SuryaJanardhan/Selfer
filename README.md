# Selfer Reference Node

Node/npm migration shell for the `src-reference` codebase.

This repository wraps a large TypeScript CLI code snapshot (`src-reference/`) with:

- a Node entry runner (`bin/selfer.mjs`)
- Bun compatibility shims (`src-reference/shims/*`, `src-reference/node-prelude.ts`)
- generated compatibility files for missing modules/import edges
- local stub packages for unavailable/private dependencies under `stubs/`

The current goal is **runtime compatibility and migration triage**, not full production parity.

## What This Repo Is

- A TypeScript + NodeNext workspace that can execute the CLI entrypoint via `tsx`
- A migration lab that tracks missing pieces using generated reports
- A scaffolding layer to progressively replace stubs with real implementations

## Current Status (from generated reports)

- Auto-generated compatibility stubs: `84`
- Markdown wrapper files (`.md.js`): `32`
- Local stub packages: `11`
- Unresolved local imports: `0`

See:

- `MIGRATION_REPORT.md`
- `MIGRATION_PRIORITY_REPORT.md`

## Repository Layout

```text
.
├── bin/
│   └── selfer.mjs                      # Node launcher for CLI entrypoint
├── scripts/
│   ├── extract-deps.cjs                # Collect external imports from src-reference
│   ├── find-missing-local-imports.cjs  # Detect unresolved relative imports
│   ├── generate-missing-local-stubs.cjs# Create placeholder modules for missing locals
│   ├── convert-md-imports.cjs          # Rewrite .md imports to .md.js wrappers
│   ├── generate-stub-package-exports.cjs # Build export surfaces for stub packages
│   └── generate-migration-report.cjs   # Generate migration dashboards
├── src-reference/                      # Main source snapshot being migrated
├── stubs/                              # Local npm packages for unavailable deps
├── types/
│   └── global.d.ts
├── package.json
├── tsconfig.json
├── MIGRATION_REPORT.md
└── MIGRATION_PRIORITY_REPORT.md
```

## Requirements

- Node.js `>= 18` (enforced in setup logic)
- npm

## Install

```bash
npm install
```

## Run

Run through npm:

```bash
npm run start
```

Or use the local bin:

```bash
node ./bin/selfer.mjs
# or after npm link / package install:
selfer
```

Dev mode is currently equivalent to start:

```bash
npm run dev
```

## Useful Scripts

```bash
npm run typecheck         # tsc noEmit (configured with noCheck=true)
npm run report:migration  # regenerate migration reports
```

Additional migration helpers (run manually):

```bash
node scripts/find-missing-local-imports.cjs
node scripts/generate-missing-local-stubs.cjs
node scripts/convert-md-imports.cjs
node scripts/generate-stub-package-exports.cjs
node scripts/extract-deps.cjs
```

## Migration Design

### 1) Bun compatibility shim

`src-reference/node-prelude.ts` initializes global compatibility objects when running under Node:

- `globalThis.Bun` polyfill shape used by the migrated code
- `globalThis.MACRO` values sourced from `src-reference/shims/macro.ts`

### 2) Feature gating replacement

`src-reference/shims/bunBundle.ts` provides `feature(name)` backed by environment flags:

- checks `FEATURE_<NAME>`
- truthy values: `1`, `true`, `on`

Example:

```bash
FEATURE_DAEMON=1 npm run start -- daemon
```

### 3) Stub strategy

Two kinds of stubs keep the tree runnable while migrating:

- **Module compatibility stubs** inside `src-reference/` for missing local files
- **Package stubs** in `stubs/` for private/native dependencies

Each stub marks itself with `__stubModule` for easy detection in audits/reports.

### 4) Migration reporting

`node scripts/generate-migration-report.cjs` produces:

- `MIGRATION_REPORT.md` (counts + inventories)
- `MIGRATION_PRIORITY_REPORT.md` (P0/P1/P2 replacement order)

Priority intent:

- `P0`: runtime-core/protocol critical
- `P1`: common command/UI/service paths
- `P2`: peripheral or low-frequency paths

## Configuration and Environment

### Macro overrides (`SELFER_*`)

Defined in `src-reference/shims/macro.ts`:

- `SELFER_VERSION`
- `SELFER_BUILD_TIME`
- `SELFER_FEEDBACK_CHANNEL`
- `SELFER_ISSUES_EXPLAINER`
- `SELFER_PACKAGE_URL`
- `SELFER_NATIVE_PACKAGE_URL`
- `SELFER_VERSION_CHANGELOG`

Example:

```bash
SELFER_VERSION=0.1.0-dev npm run start -- --version
```

### Optional runtime toggles

`package.json` includes helper scripts for Ollama-backed runs:

```bash
npm run start:ollama
npm run start:qwen
```

These set `CLAUDE_CODE_USE_OLLAMA=1` (and model override in `start:qwen`).

## Known Limitations

- This is still a migration shell with active compatibility shims.
- Stubbed packages can satisfy imports while not implementing true behavior.
- `typecheck` is currently permissive (`noCheck: true`) and does not guarantee semantic safety.
- Some advanced flows may require replacing stubs with real implementations.

## Recommended Migration Loop

1. Regenerate reports: `npm run report:migration`
2. Pick the highest-priority stub/package from `MIGRATION_PRIORITY_REPORT.md`
3. Replace or implement real module/package behavior
4. Run `npm run typecheck`
5. Re-run migration report and verify counts trend downward

## Notes

`src-reference/README.md` contains context specific to the source snapshot itself. This top-level README documents the **Node migration workspace and contributor workflow**.
