# Worker File Deduplication Instructions

The file `worker/index.ts` contains 5 duplicate copies of a ~917-line route handler block.
The file is also truncated at the end (line 6289), causing a syntax error.

## What's in the file now:
- **Lines 1-2422**: Good code (imports, helpers, Stripe routes, and ONE copy of public route handlers)
- **Lines 2423-6289**: FIVE duplicate copies of the same route handlers (dead code) + truncated ending

## How to fix:

### Option 1: Manual deletion
1. Open `worker/index.ts`
2. Delete everything from line 2423 to the end of the file
3. Add the following at the end:

```typescript

    // 404 fallback — no route matched
    return json({ error: 'Not found' }, { status: 404 });
  },
};
```

### Option 2: Use the fixed file
1. Copy `worker/index.clean.ts` to replace `worker/index.ts`

After fixing, the file should be ~2430 lines instead of ~6289.
