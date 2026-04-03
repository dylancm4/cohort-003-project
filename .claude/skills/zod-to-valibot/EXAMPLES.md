# Zod to Valibot -- Migration Examples

## Example 1: User registration form

### Before (Zod)
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(18).max(120).optional(),
  role: z.enum(['admin', 'user', 'moderator']),
  website: z.string().url().optional(),
});

type User = z.infer<typeof UserSchema>;

const result = UserSchema.safeParse(input);
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error.flatten());
}
```

### After (Valibot)
```typescript
import * as v from 'valibot';

const UserSchema = v.object({
  name: v.pipe(v.string(), v.minLength(2), v.maxLength(50)),
  email: v.pipe(v.string(), v.email()),
  age: v.optional(v.pipe(v.number(), v.integer(), v.minValue(18), v.maxValue(120))),
  role: v.picklist(['admin', 'user', 'moderator']),
  website: v.optional(v.pipe(v.string(), v.url())),
});

type User = v.InferOutput<typeof UserSchema>;

const result = v.safeParse(UserSchema, input);
if (result.success) {
  console.log(result.output);
} else {
  console.log(v.flatten(result.issues));
}
```

Key changes:
- `z.enum` -> `v.picklist`
- `.optional()` wraps the schema: `v.optional(schema)`
- Method chains become `v.pipe(schema, ...actions)`
- `.min()/.max()` on strings -> `v.minLength()/v.maxLength()`
- `.min()/.max()` on numbers -> `v.minValue()/v.maxValue()`
- `result.data` -> `result.output`
- `result.error.flatten()` -> `v.flatten(result.issues)`

---

## Example 2: Password confirmation with cross-field validation

### Before (Zod)
```typescript
import { z } from 'zod';

const PasswordForm = z.object({
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
});
```

### After (Valibot)
```typescript
import * as v from 'valibot';

const PasswordForm = v.pipe(
  v.object({
    password: v.pipe(v.string(), v.minLength(8), v.regex(/[A-Z]/, 'Must contain uppercase')),
    confirmPassword: v.string(),
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['confirmPassword']],
      input => input.password === input.confirmPassword,
      'Passwords must match'
    ),
    ['confirmPassword']
  )
);
```

---

## Example 3: API response with transforms and defaults

### Before (Zod)
```typescript
import { z } from 'zod';

const ApiResponseSchema = z.object({
  id: z.string().uuid(),
  count: z.number().default(0),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime().transform(s => new Date(s)),
  status: z.discriminatedUnion('type', [
    z.object({ type: z.literal('active'), since: z.date() }),
    z.object({ type: z.literal('inactive'), reason: z.string() }),
  ]),
});

type ApiResponse = z.infer<typeof ApiResponseSchema>;
```

### After (Valibot)
```typescript
import * as v from 'valibot';

const ApiResponseSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  count: v.optional(v.number(), 0),
  tags: v.optional(v.array(v.string()), []),
  metadata: v.optional(v.record(v.string(), v.unknown())),
  createdAt: v.pipe(v.string(), v.isoDateTime(), v.transform(s => new Date(s))),
  status: v.variant('type', [
    v.object({ type: v.literal('active'), since: v.date() }),
    v.object({ type: v.literal('inactive'), reason: v.string() }),
  ]),
});

type ApiResponse = v.InferOutput<typeof ApiResponseSchema>;
```

Key changes:
- `.default(val)` -> `v.optional(schema, val)` (second arg is the default)
- `.datetime()` -> `v.isoDateTime()`
- `z.discriminatedUnion` -> `v.variant`
- `.transform()` goes inside `v.pipe()`

---

## Example 4: Strict object and passthrough

### Before (Zod)
```typescript
const Strict = z.object({ a: z.string() }).strict();
const Loose = z.object({ a: z.string() }).passthrough();
const WithCatchall = z.object({ a: z.string() }).catchall(z.number());
```

### After (Valibot)
```typescript
const Strict = v.strictObject({ a: v.string() });
const Loose = v.looseObject({ a: v.string() });
const WithCatchall = v.objectWithRest({ a: v.string() }, v.number());
```

---

## Example 5: Coercion

### Before (Zod)
```typescript
const CoercedNumber = z.coerce.number();
const CoercedDate = z.coerce.date();
const CoercedString = z.coerce.string();
```

### After (Valibot)
```typescript
const CoercedNumber = v.pipe(v.unknown(), v.transform(Number));
const CoercedDate = v.pipe(v.unknown(), v.transform(val => new Date(val as string | number)));
const CoercedString = v.pipe(v.unknown(), v.transform(String));
```

---

## Example 6: Branded types

### Before (Zod)
```typescript
const UserId = z.string().uuid().brand<'UserId'>();
type UserId = z.infer<typeof UserId>;
```

### After (Valibot)
```typescript
const UserId = v.pipe(v.string(), v.uuid(), v.brand('UserId'));
type UserId = v.InferOutput<typeof UserId>;
```

---

## Example 7: Recursive schema

### Before (Zod)
```typescript
type TreeNode = {
  value: string;
  children: TreeNode[];
};

const TreeNodeSchema: z.ZodType<TreeNode> = z.object({
  value: z.string(),
  children: z.lazy(() => z.array(TreeNodeSchema)),
});
```

### After (Valibot)
```typescript
type TreeNode = {
  value: string;
  children: TreeNode[];
};

const TreeNodeSchema: v.GenericSchema<TreeNode> = v.object({
  value: v.string(),
  children: v.array(v.lazy(() => TreeNodeSchema)),
});
```

---

## Example 8: Error handling

### Before (Zod)
```typescript
try {
  schema.parse(data);
} catch (e) {
  if (e instanceof z.ZodError) {
    const flat = e.flatten();
    console.log(flat.fieldErrors);
  }
}
```

### After (Valibot)
```typescript
const result = v.safeParse(schema, data);
if (!result.success) {
  const flat = v.flatten(result.issues);
  console.log(flat.nested);  // equivalent to fieldErrors
}
```

---

## Example 9: Async validation

### Before (Zod)
```typescript
const Schema = z.object({
  username: z.string().refine(
    async (val) => await checkAvailability(val),
    'Username taken'
  ),
});

const result = await Schema.safeParseAsync(data);
```

### After (Valibot)
```typescript
const Schema = v.objectAsync({
  username: v.pipeAsync(
    v.string(),
    v.checkAsync(async (val) => await checkAvailability(val), 'Username taken')
  ),
});

const result = await v.safeParseAsync(Schema, data);
```

---

## Example 10: Preprocess / catch

### Before (Zod)
```typescript
const TrimmedString = z.preprocess(val => String(val).trim(), z.string().min(1));
const SafeNumber = z.number().catch(0);
```

### After (Valibot)
```typescript
const TrimmedString = v.pipe(v.unknown(), v.transform(val => String(val).trim()), v.string(), v.minLength(1));
const SafeNumber = v.fallback(v.number(), 0);
```

---

## Example 11: Pick, omit, partial, extend, merge

### Before (Zod)
```typescript
const Full = z.object({ a: z.string(), b: z.number(), c: z.boolean() });

const Picked = Full.pick({ a: true, b: true });
const Omitted = Full.omit({ c: true });
const Partial = Full.partial();
const Extended = Full.extend({ d: z.date() });
const Merged = Full.merge(z.object({ e: z.string() }));
```

### After (Valibot)
```typescript
const Full = v.object({ a: v.string(), b: v.number(), c: v.boolean() });

const Picked = v.pick(Full, ['a', 'b']);
const Omitted = v.omit(Full, ['c']);
const Partial = v.partial(Full);
const Extended = v.object({ ...Full.entries, d: v.date() });
const Merged = v.object({ ...Full.entries, e: v.string() });
```
