import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: webcrypto });
const compiled = ts.transpileModule(fs.readFileSync('src/lib/auth.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const auth = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  (name) => { assert.equal(name, 'server-only'); return {}; }, auth, auth.exports,
);
const { signToken, verifyToken } = auth.exports;

test('session rejects forged, expired, malformed and wrong-owner tokens', async () => {
  process.env.AUTH_SECRET = 'test-only-private-secret-with-at-least-32-characters';
  process.env.AUTH_USERNAME = 'owner';
  const token = await signToken({ u: 'owner', t: Date.now() + 60000 });
  assert.equal((await verifyToken(token)).u, 'owner');
  assert.equal(await verifyToken(token + 'x'), null);
  assert.equal(await verifyToken('bad.token.extra'), null);
  assert.equal(await verifyToken(await signToken({ u: 'owner', t: Date.now() - 1 })), null);
  assert.equal(await verifyToken(await signToken({ u: 'other', t: Date.now() + 60000 })), null);
  assert.equal(await verifyToken(await signToken({ u: 'owner', t: 'future' })), null);
});

test('missing or publicly known signing secret fails closed', async () => {
  for (const secret of ['', 'short', 'DEV_ONLY_INSECURE_SECRET_CHANGE_ME']) {
    process.env.AUTH_SECRET = secret;
    await assert.rejects(signToken({ u: 'owner', t: Date.now() + 60000 }));
    assert.equal(await verifyToken('body.signature'), null);
  }
});
