# Zod to Valibot -- Complete API Reference

> **Important**: This reference may become outdated. Before migrating, verify the current Valibot API at https://valibot.dev/api/ and the official migration guide at https://valibot.dev/guides/migrate-from-zod/.

## Architecture differences

| Aspect | Zod | Valibot |
|--------|-----|---------|
| Design | OOP, method chaining | Functional, composable functions |
| Tree-shaking | Poor (class methods) | Excellent (standalone functions) |
| Bundle (typical form) | ~17.7 kB | ~1.37 kB (90% smaller) |

Valibot is built on three pillars:
- **Schemas** -- define data types (`v.string()`, `v.object({...})`)
- **Methods** -- operate on schemas (`v.parse()`, `v.partial()`)
- **Actions** -- used inside `v.pipe()` to validate/transform (`v.email()`, `v.transform()`)

## Primitive schemas

| Zod | Valibot |
|-----|---------|
| `z.string()` | `v.string()` |
| `z.number()` | `v.number()` |
| `z.boolean()` | `v.boolean()` |
| `z.bigint()` | `v.bigint()` |
| `z.date()` | `v.date()` |
| `z.symbol()` | `v.symbol()` |
| `z.undefined()` | `v.undefined()` |
| `z.null()` | `v.null()` |
| `z.void()` | `v.void()` |
| `z.nan()` | `v.nan()` |
| `z.never()` | `v.never()` |
| `z.any()` | `v.any()` |
| `z.unknown()` | `v.unknown()` |

## Complex schemas

| Zod | Valibot |
|-----|---------|
| `z.object({...})` | `v.object({...})` (strips unknown keys) |
| `z.object({...}).strict()` | `v.strictObject({...})` |
| `z.object({...}).passthrough()` | `v.looseObject({...})` |
| `z.object({...}).catchall(schema)` | `v.objectWithRest({...}, schema)` |
| `z.array(schema)` | `v.array(schema)` |
| `z.tuple([a, b])` | `v.tuple([a, b])` (strips extra items) |
| `z.tuple([a, b]).rest(c)` | `v.tupleWithRest([a, b], c)` |
| `z.record(key, val)` | `v.record(key, val)` |
| `z.map(key, val)` | `v.map(key, val)` |
| `z.set(schema)` | `v.set(schema)` |
| `z.union([a, b])` | `v.union([a, b])` |
| `z.discriminatedUnion('key', [...])` | `v.variant('key', [...])` |
| `z.intersection(a, b)` | `v.intersect([a, b])` |
| `z.literal('foo')` | `v.literal('foo')` |
| `z.enum(['a', 'b'])` | `v.picklist(['a', 'b'])` |
| `z.nativeEnum(TsEnum)` | `v.enum(TsEnum)` |
| `z.promise()` | `v.promise()` |
| `z.function()` | `v.function()` |
| `z.lazy(() => schema)` | `v.lazy(() => schema)` |
| `z.instanceof(Class)` | `v.instance(Class)` |
| `z.custom(fn)` | `v.custom<Type>(fn)` |

## Optional / nullable / nullish

| Zod | Valibot |
|-----|---------|
| `schema.optional()` | `v.optional(schema)` |
| `schema.nullable()` | `v.nullable(schema)` |
| `schema.nullish()` | `v.nullish(schema)` |
| `schema.default(val)` | `v.optional(schema, val)` |
| `schema.catch(val)` | `v.fallback(schema, val)` |

Valibot extras (no Zod equivalent):
- `v.exactOptional(schema)` -- allows missing key but not explicit `undefined`
- `v.undefinedable(schema)` -- accepts `undefined` without marking property as `?`
- `v.nonNullable(schema)`, `v.nonNullish(schema)`, `v.nonOptional(schema)` -- remove wrappers

## Object utilities

| Zod | Valibot |
|-----|---------|
| `Schema.partial()` | `v.partial(Schema)` |
| `Schema.required()` | `v.required(Schema)` |
| `Schema.pick({ a: true })` | `v.pick(Schema, ['a'])` |
| `Schema.omit({ b: true })` | `v.omit(Schema, ['b'])` |
| `Schema.extend({...})` | `v.object({ ...Schema.entries, ...newFields })` |
| `Schema.merge(Other)` | `v.object({ ...Schema.entries, ...Other.entries })` |
| `Schema.shape` | `Schema.entries` |
| `Schema.keyof()` | `v.keyof(Schema)` |

Selective partial/required:
```typescript
v.partial(Schema, ['key1']);     // only key1 optional
v.required(Schema, ['key2']);    // only key2 required
```

## Type inference

| Zod | Valibot |
|-----|---------|
| `z.infer<typeof S>` | `v.InferOutput<typeof S>` |
| `z.input<typeof S>` | `v.InferInput<typeof S>` |
| `z.output<typeof S>` | `v.InferOutput<typeof S>` |

## Parsing methods

| Zod | Valibot |
|-----|---------|
| `schema.parse(data)` | `v.parse(schema, data)` |
| `schema.safeParse(data)` | `v.safeParse(schema, data)` |
| `schema.parseAsync(data)` | `v.parseAsync(schema, data)` |
| `schema.safeParseAsync(data)` | `v.safeParseAsync(schema, data)` |
| -- | `v.is(schema, data)` (type guard) |
| -- | `v.assert(schema, data)` (assertion) |

Options: `v.parse(schema, data, { abortEarly: true, abortPipeEarly: true })`

## String validation actions

| Zod | Valibot |
|-----|---------|
| `.min(n)` | `v.minLength(n)` |
| `.max(n)` | `v.maxLength(n)` |
| `.length(n)` | `v.length(n)` |
| `.email()` | `v.email()` |
| `.url()` | `v.url()` |
| `.uuid()` | `v.uuid()` |
| `.cuid2()` | `v.cuid2()` |
| `.ulid()` | `v.ulid()` |
| `.regex(r)` | `v.regex(r)` |
| `.includes(s)` | `v.includes(s)` |
| `.startsWith(s)` | `v.startsWith(s)` |
| `.endsWith(s)` | `v.endsWith(s)` |
| `.trim()` | `v.trim()` |
| `.toLowerCase()` | `v.toLowerCase()` |
| `.toUpperCase()` | `v.toUpperCase()` |
| `.datetime()` | `v.isoDateTime()` or `v.isoTimestamp()` |
| `.ip()` | `v.ip()` |
| `.ipv4()` | `v.ipv4()` |
| `.ipv6()` | `v.ipv6()` |
| `.emoji()` | `v.emoji()` |
| `.nanoid()` | `v.nanoid()` |
| `.nonempty()` | `v.nonEmpty()` |

## Number validation actions

| Zod | Valibot |
|-----|---------|
| `.min(n)` / `.gte(n)` | `v.minValue(n)` |
| `.max(n)` / `.lte(n)` | `v.maxValue(n)` |
| `.gt(n)` | `v.gtValue(n)` |
| `.lt(n)` | `v.ltValue(n)` |
| `.int()` | `v.integer()` |
| `.positive()` | `v.gtValue(0)` |
| `.negative()` | `v.ltValue(0)` |
| `.nonnegative()` | `v.minValue(0)` |
| `.nonpositive()` | `v.maxValue(0)` |
| `.multipleOf(n)` | `v.multipleOf(n)` |
| `.finite()` | `v.finite()` |
| `.safe()` | `v.safeInteger()` |

## Array/set/map size actions

| Zod | Valibot (array) | Valibot (set/map) |
|-----|-----------------|-------------------|
| `.min(n)` | `v.minLength(n)` | `v.minSize(n)` |
| `.max(n)` | `v.maxLength(n)` | `v.maxSize(n)` |
| `.length(n)` / `.size(n)` | `v.length(n)` | `v.size(n)` |
| `.nonempty()` | `v.nonEmpty()` | `v.nonEmpty()` |
| `.element` | `.item` | -- |

## Refinements

| Zod | Valibot |
|-----|---------|
| `.refine(fn, msg)` | `v.check(fn, msg)` inside `v.pipe()` |
| `.superRefine(fn)` | `v.rawCheck(fn)` inside `v.pipe()` |
| `.refine(fn, { path })` | `v.forward(v.partialCheck([paths], fn, msg), targetPath)` |

## Transformations

| Zod | Valibot |
|-----|---------|
| `.transform(fn)` | `v.transform(fn)` inside `v.pipe()` |
| `z.preprocess(fn, schema)` | `v.pipe(v.unknown(), v.transform(fn), schema)` |
| `z.coerce.number()` | `v.pipe(v.unknown(), v.transform(Number))` |
| `z.coerce.string()` | `v.pipe(v.unknown(), v.transform(String))` |
| `z.coerce.boolean()` | `v.pipe(v.unknown(), v.transform(Boolean))` |

Built-in transform actions: `v.toNumber()`, `v.toBigint()`, `v.toBoolean()`, `v.toDate()`, `v.toString()`, `v.toMinValue(n)`, `v.toMaxValue(n)`

## Brand types

```typescript
// Zod
const Branded = z.string().brand<'UserId'>();
// Valibot
const Branded = v.pipe(v.string(), v.brand('UserId'));
```

## Recursive schemas

```typescript
// Valibot requires explicit GenericSchema type annotation
type Category = { name: string; subcategories: Category[] };
const CategorySchema: v.GenericSchema<Category> = v.object({
  name: v.string(),
  subcategories: v.array(v.lazy(() => CategorySchema)),
});
```

## Async validation

Append `Async` to function names:
- Schemas: `v.objectAsync`, `v.arrayAsync`, `v.unionAsync`, etc.
- Actions: `v.checkAsync`, `v.transformAsync`, `v.rawCheckAsync`, etc.
- Methods: `v.parseAsync`, `v.safeParseAsync`, `v.pipeAsync`, etc.

Rules:
- Async functions can only be nested inside other async functions
- Sync functions CAN nest inside async functions
- TypeScript enforces this at the type level

## Error handling

| Zod | Valibot |
|-----|---------|
| `e instanceof z.ZodError` | `v.isValiError(e)` |
| `error.issues` | `error.issues` |
| `error.flatten()` | `v.flatten(result.issues)` |
| `error.format()` | No direct equivalent |

Issue structure: `{ kind, type, input, expected, received, message, path?, requirement?, issues? }`

Custom messages:
```typescript
// Zod
z.string({ invalid_type_error: 'Not a string' }).min(5, { message: 'Too short' });
// Valibot
v.pipe(v.string('Not a string'), v.minLength(5, 'Too short'));
```

## Other methods

| Zod | Valibot |
|-----|---------|
| `Schema.describe('...')` | `v.pipe(schema, v.description('...'))` |
| `Schema.or(other)` | `v.union([schema, other])` |
| `Schema.and(other)` | `v.intersect([schema, other])` |
| `Schema.unwrap()` | `v.unwrap(schema)` |
| `Schema.pipe(other)` | `v.pipe(schema, other)` |

## Automated codemod (beta)

```bash
npx @valibot/zod-to-valibot src/**/* --dry   # preview
npx @valibot/zod-to-valibot src/**/*         # apply
```

May not handle complex generics, dynamic schemas, or custom Zod extensions.
