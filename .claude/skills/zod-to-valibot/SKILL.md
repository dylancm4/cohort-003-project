---
name: zod-to-valibot
description: Migrate schema validation code from Zod to Valibot. Use when user asks to migrate, convert, or replace Zod with Valibot, or when refactoring validation schemas from Zod's OOP method-chaining API to Valibot's functional modular API. Works across any TypeScript repository.
---

# Zod to Valibot Migration

Migrate Zod schemas to Valibot's functional, tree-shakeable API.

## Before you start

1. Research the current state of the Valibot API by reading https://valibot.dev/api/ and https://valibot.dev/guides/migrate-from-zod/ -- the reference bundled with this skill may be outdated.
2. Read [REFERENCE.md](REFERENCE.md) for the complete API mapping.
3. Read [EXAMPLES.md](EXAMPLES.md) for before/after migration patterns.

## Migration workflow

- [ ] **Audit** -- find all Zod usage: `grep -r "from ['\"]zod['\"]" --include="*.ts" --include="*.tsx"`
- [ ] **Dependency swap** -- install valibot, remove zod from package.json
- [ ] **Migrate file by file** -- apply the transformations below, one file at a time
- [ ] **Update types** -- replace `z.infer<>` with `v.InferOutput<>`, `z.input<>` with `v.InferInput<>`
- [ ] **Run type checker** -- `tsc --noEmit` to catch remaining issues
- [ ] **Run tests** -- ensure all validation behavior is preserved

## Core transformation rules

### 1. Imports
```typescript
// Before                        // After
import { z } from 'zod';        import * as v from 'valibot';
```

### 2. Method chains become pipes
```typescript
// Before                                    // After
z.string().email().min(5)                    v.pipe(v.string(), v.email(), v.minLength(5))
```

### 3. Parse/safeParse become standalone functions
```typescript
// Before                                    // After
schema.parse(data)                           v.parse(schema, data)
schema.safeParse(data)                       v.safeParse(schema, data)
```

### 4. Object variants
```typescript
// Before                                    // After
z.object({...})                              v.object({...})           // strips unknown
z.object({...}).strict()                     v.strictObject({...})
z.object({...}).passthrough()                v.looseObject({...})
```

### 5. Key renames
| Zod | Valibot |
|-----|---------|
| `z.enum([...])` | `v.picklist([...])` |
| `z.nativeEnum(E)` | `v.enum(E)` |
| `z.discriminatedUnion(k, [...])` | `v.variant(k, [...])` |
| `z.intersection(a, b)` | `v.intersect([a, b])` |
| `z.instanceof(C)` | `v.instance(C)` |
| `.refine(fn, msg)` | `v.check(fn, msg)` inside pipe |
| `.superRefine(fn)` | `v.rawCheck(fn)` inside pipe |
| `.default(val)` | `v.optional(schema, val)` |
| `.catch(val)` | `v.fallback(schema, val)` |

### 6. Number validations use `*Value` suffix
`.min(n)` -> `v.minValue(n)`, `.max(n)` -> `v.maxValue(n)`, `.gt(n)` -> `v.gtValue(n)`, `.lt(n)` -> `v.ltValue(n)`

### 7. String/array length validations use `*Length` suffix
`.min(n)` -> `v.minLength(n)`, `.max(n)` -> `v.maxLength(n)`

See [REFERENCE.md](REFERENCE.md) for the complete mapping and [EXAMPLES.md](EXAMPLES.md) for real-world patterns.

## Common gotchas

- **No `z.coerce`** -- use `v.pipe(v.unknown(), v.transform(Number))` or built-in `v.toNumber()`
- **Recursive schemas** require explicit `v.GenericSchema<T>` type annotation
- **Async validation** -- append `Async` to schema/action/method names (`v.objectAsync`, `v.pipeAsync`, `v.parseAsync`)
- **`.shape`** is now `.entries` on object schemas
- **Error flattening** -- `v.flatten(result.issues)` not `error.flatten()`
- **Cross-field validation** -- use `v.forward(v.partialCheck(...), path)` instead of `.refine()` with `path`
