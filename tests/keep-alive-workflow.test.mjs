import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/keep-alive.yml", "utf8");

test("keep-alive runs every day and writes the heartbeat row", () => {
  assert.match(workflow, /cron:\s*"0 3 \* \* \*"/);
  assert.match(workflow, /workflow_dispatch:\s*\{\}/);
  assert.match(workflow, /\/rest\/v1\/KeepAlive\?id=eq\.1/);
  assert.match(workflow, /-X PATCH/);
  assert.match(workflow, /secrets\.SUPABASE_ANON_KEY/);
  assert.doesNotMatch(workflow, /\/api\/products/);
  assert.doesNotMatch(workflow, /secrets\.SUPABASE_SERVICE_ROLE/);
});
