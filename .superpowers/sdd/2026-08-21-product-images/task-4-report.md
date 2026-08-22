# Task 4 Report: Adaptador de almacenamiento

## Summary
Successfully implemented the storage adapter with two drivers (local and vercel-blob) following all requirements from task-4-brief.md.

## Changes by File

### New Files Created

**src/app/lib/storage/localDriver.js**
- Development storage driver that writes files to `public/uploads`
- Implements `put(buffer, { key })` → `Promise<{ url, pathname }>`
- Implements `remove(image)` → `Promise<void>`
- Uses `path.join` for cross-platform file path handling
- CRLF line endings verified ✓

**src/app/lib/storage/vercelBlobDriver.js**
- Production storage driver using @vercel/blob API
- Implements same contract as local driver
- Uses `addRandomSuffix: false` since key already has random suffix from `buildProductImageKey`
- Deletes by URL, not pathname (due to Vercel Blob API requirements)
- CRLF line endings verified ✓

**src/app/lib/storage/index.js**
- Exports `getStorage()` function that selects driver based on `STORAGE_DRIVER` env var
- Supports exactly `local` (default) and `vercel-blob` values
- Throws error for unknown driver names
- CRLF line endings verified ✓

**.env.example** (Created)
- Added storage configuration section with:
  - `STORAGE_DRIVER=local` (default)
  - `BLOB_READ_WRITE_TOKEN=` (for vercel-blob mode)
- Includes comments explaining usage modes
- CRLF line endings verified ✓

### Modified Files

**.gitignore**
- Added entry to ignore local uploads: `/public/uploads`
- Comment explaining it's for local development driver
- CRLF line endings verified ✓

**package.json** & **package-lock.json**
- Added @vercel/blob@^2.8.0 dependency (25 packages added to node_modules)

## Step-by-Step Execution

### Step 1: Install @vercel/blob
```bash
npm install @vercel/blob
```
Result: ✓ Added 25 packages successfully

### Step 2-4: Created Storage Drivers
Created three files implementing the driver pattern:
- localDriver.js: Write to public/uploads, CRLF normalized
- vercelBlobDriver.js: Vercel Blob API wrapper, CRLF normalized  
- index.js: Driver selection logic, CRLF normalized

### Step 5: .gitignore Update
```
/public/uploads
```
Result: ✓ Entry added at end of file

### Step 6: .env.example Creation
Added documentation for storage variables with both local and vercel-blob configurations.

### Step 7: Verification

**ESLint Check:**
```bash
npx eslint src
```
Result: ✓ 11 problems (4 errors, 7 warnings) - same as baseline, no new issues

**Build Check:**
```bash
npm run build
```
Result: ✓ Build succeeded without errors

**Local Driver End-to-End Test:**
```bash
node --input-type=module -e "
const { localDriver } = await import('./src/app/lib/storage/localDriver.js');
const key = 'tenants/demo/products/deadbeefdeadbeefdeadbeef-a1b2c3d4.png';
const stored = await localDriver.put(Buffer.from([1,2,3]), { key });
console.log(stored);
const { existsSync } = await import('node:fs');
console.log('existe:', existsSync('public/uploads/' + key));
await localDriver.remove(stored);
console.log('existe tras borrar:', existsSync('public/uploads/' + key));
"
```

**Output:**
```
{
  url: '/uploads/tenants/demo/products/deadbeefdeadbeefdeadbeef-a1b2c3d4.png',
  pathname: 'tenants/demo/products/deadbeefdeadbeefdeadbeef-a1b2c3d4.png'
}
existe: true
existe tras borrar: false
```

Result: ✓ All expected behaviors confirmed

**Test Suite:**
```bash
npm test
```
Result: ✓ 23 tests passed (baseline maintained)

**Cleanup:**
```bash
rm -rf public/uploads
```
Result: ✓ Test artifacts removed

### Step 8: Git Commit
```bash
git add package.json package-lock.json .gitignore .env.example src/app/lib/storage
git commit -m "feat(storage): adaptador con drivers local y vercel-blob"
```

**Commit Details:**
- SHA: `3317b0a`
- 7 files changed
- 380 insertions
- New files: .env.example, index.js, localDriver.js, vercelBlobDriver.js

## Verification Summary

✓ STORAGE_DRIVER env var validation (throws on unknown values)
✓ Driver contract: `put(buffer, { key, contentType })` → `{ url, pathname }`
✓ Driver contract: `remove(image)` → void
✓ File paths built with `path.join` (Windows/Linux compatible)
✓ CRLF line endings on all created/modified files
✓ Spanish comments for "why" only
✓ No modification to earlier task files
✓ No test breakage (23/23 tests still passing)
✓ Build success with no new ESLint issues
✓ Local driver end-to-end verification: write → verify → delete → verify
✓ .gitignore properly ignores local uploads
✓ .env.example documents all storage configuration
✓ .env.example forced with -f (due to .env* pattern in .gitignore)

## Deviations and Notes

**Note on .env.example:**
The .env.example file required `git add -f` to be added to staging because the existing `.env*` pattern in .gitignore matches it. This is the correct behavior—.env example files should be tracked in git, unlike real .env files with credentials.

**No Issues Found (Initial):**
All steps completed successfully per specification. Driver contract is correct, cross-platform path handling is correct, and both drivers are properly implemented.

---

## Fix Round 1: Idempotency of localDriver.remove

### Issue Found
`localDriver.remove` was not idempotent. Calling `unlink()` on a non-existent file throws ENOENT, breaking the adapter contract—callers cannot ignore which backend is active.

### Solution
Modified `src/app/lib/storage/localDriver.js` to catch `ENOENT` errors and treat them as already-removed (goal achieved). Other errors propagate for real failure visibility.

**Change:**
```js
  async remove(image) {
    if (!image?.pathname) {
      return;
    }

    try {
      await unlink(toFilePath(image.pathname));
    } catch (error) {
      // ENOENT ("No such file") no es un error: el objetivo es que el archivo no exista,
      // y ya no existe. Cualquier otro error (permisos, archivo abierto, etc) se propaga
      // para que el caller vea problemas reales.
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  },
```

### Fix Verification

**Command 1: End-to-end test with idempotency check**
```bash
node --input-type=module -e "
const { localDriver } = await import('./src/app/lib/storage/localDriver.js');
const key = 'tenants/demo/products/deadbeefdeadbeefdeadbeef-a1b2c3d4.png';
const stored = await localDriver.put(Buffer.from([1,2,3]), { key });
console.log('1. Write result:', stored);
const { existsSync } = await import('node:fs');
console.log('2. File exists after write:', existsSync('public/uploads/' + key));
await localDriver.remove(stored);
console.log('3. File exists after first remove:', existsSync('public/uploads/' + key));
await localDriver.remove(stored);
console.log('4. File exists after second remove (idempotent):', existsSync('public/uploads/' + key));
console.log('5. Idempotency test: PASSED - remove called twice without error');
"
```

**Output:**
```
1. Write result: {
  url: '/uploads/tenants/demo/products/deadbeefdeadbeefdeadbeef-a1b2c3d4.png',
  pathname: 'tenants/demo/products/deadbeefdeadbeefdeadbeef-a1b2c3d4.png'
}
2. File exists after write: true
3. File exists after first remove: false
4. File exists after second remove (idempotent): false
5. Idempotency test: PASSED - remove called twice without error
```

Result: ✓ Idempotency verified—remove succeeds twice on same object

**Command 2: ESLint**
```bash
npx eslint src
```

Result: ✓ 11 problems (4 errors, 7 warnings)—baseline maintained, no new issues

**Command 3: Build**
```bash
npm run build
```

Result: ✓ Build succeeded

**Command 4: Test Suite**
```bash
npm test
```

Result: ✓ 23 tests passed (baseline maintained)

**Command 5: Cleanup**
```bash
rm -rf public/uploads
```

Result: ✓ Test artifacts removed

### Fix Commit
```bash
git add src/app/lib/storage/localDriver.js
git commit -m "fix(storage): make localDriver.remove idempotent by handling ENOENT"
```

**Commit Details:**
- SHA: `35a6541`
- 1 file changed
- 12 insertions, 1 deletion
