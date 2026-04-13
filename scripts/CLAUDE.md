# Scripts

Utility scripts for the scaffold.

## Key Files

- `daml-codegen.sh` — Batch codegen: runs `dpm codegen-js` for every `.dar` in a directory

## Usage

```bash
# Generate TypeScript bindings from compiled DARs
scripts/daml-codegen.sh -i daml/.daml/dist -o backend/src/generated
```

Outputs `template-ids.ts` with package-hashed template IDs. Run after every `daml build`.
