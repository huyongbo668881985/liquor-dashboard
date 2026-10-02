import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compiled = ts.transpileModule(fs.readFileSync('src/lib/session.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const session = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => {
  if (name === './auth') return { verifyToken: async (token) => token === 'valid' ? { u:'owner' } : null };
  if (name === 'next/server') return { NextResponse: { json: (body, init) => ({ body, status:init.status }) } };
  if (['server-only', 'next/headers', 'next/navigation'].includes(name)) return {};
  throw new Error(`Unexpected import ${name}`);
}, session, session.exports);

const request = (headers, token = 'valid', method = 'POST') => ({
  method,
  headers: new Headers(headers),
  cookies: { get: () => token ? { value:token } : undefined },
  nextUrl: new URL('http://localhost:3107/api/products'),
});

test('normal local and reverse-proxy writes pass independent of internal URL', async () => {
  for (const headers of [
    { host:'127.0.0.1:3107', origin:'http://127.0.0.1:3107' },
    { host:'dashboard.example.test', origin:'https://dashboard.example.test' },
    { host:'internal:3107', 'x-forwarded-host':'dashboard.example.test', origin:'https://dashboard.example.test' },
    { host:'internal:3107', 'x-forwarded-host':'dashboard.example.test, proxy.internal', origin:'https://dashboard.example.test' },
    { host:'dashboard.example.test' }, // Existing curl keep-alive/client compatibility.
  ]) assert.equal(await session.exports.authorizeApi(request(headers)), null);
});

test('cross-site, malformed origins and invalid sessions remain denied', async () => {
  for (const origin of ['https://attacker.invalid', 'null', 'not-a-url', 'ftp://dashboard.example.test']) {
    assert.equal((await session.exports.authorizeApi(request({ host:'dashboard.example.test', origin }))).status,403);
  }
  assert.equal((await session.exports.authorizeApi(request({ host:'dashboard.example.test', origin:'https://dashboard.example.test', 'sec-fetch-site':'cross-site' }))).status,403);
  for (const token of ['', 'forged']) {
    assert.equal((await session.exports.authorizeApi(request({}, token))).status,401);
  }
});
