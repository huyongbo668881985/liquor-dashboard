// Exercise the saved migration twice, then all CRUD and permission checks.
// Everything runs inside one transaction that is ALWAYS rolled back.
import 'dotenv/config';
import pg from 'pg';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client = new pg.Client({ connectionString: process.env.DIRECT_URL, connectionTimeoutMillis:10000 });
const quote = (s) => '"' + s.replaceAll('"', '""') + '"';
await client.connect();
try {
  await client.query('BEGIN');
  const role = (await client.query("SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user")).rows[0];
  assert.equal(role.rolbypassrls, true, 'Server database connection must bypass RLS');
  const sql = readFileSync('prisma/migrations/20261002000000_lock_down_public_data_api/migration.sql', 'utf8')
    .replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, '');
  await client.query(sql);
  await client.query(sql);
  const tables = (await client.query("SELECT relname,relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND relkind IN ('r','p')")).rows;
  assert.equal(tables.length, 10, 'Unexpected table inventory: review all additional tables');
  assert.ok(tables.every(t => t.relrowsecurity));
  for (const roleName of ['anon', 'authenticated']) {
    for (const table of tables) {
      const tableSql = `public.${quote(table.relname)}`;
      for (const statement of [
        `SELECT * FROM ${tableSql} LIMIT 0`,
        `INSERT INTO ${tableSql} DEFAULT VALUES`,
        `UPDATE ${tableSql} SET id=id WHERE false`,
        `DELETE FROM ${tableSql} WHERE false`,
        `TRUNCATE ${tableSql}`,
      ]) {
        await client.query('SAVEPOINT denied');
        await client.query(`SET LOCAL ROLE ${roleName}`);
        let code;
        try { await client.query(statement); } catch (error) { code = error.code; }
        await client.query('ROLLBACK TO SAVEPOINT denied');
        assert.equal(code, '42501', `${roleName}: ${statement} must be denied`);
      }
    }
  }
  // Negative explicit IDs avoid modifying production sequences. No rows survive rollback.
  const id = -2147483000;
  const rows = {
    Product: { name:'security-test', cost:1 },
    Distributor: { name:'security-test' },
    DirectSale: { date:new Date(), productId:id, quantity:1, amount:1 },
    DirectPurchase: { date:new Date(), productId:id, quantity:1, amount:1 },
    DirectExpense: { date:new Date(), category:'security-test', amount:1 },
    Shipment: { date:new Date(), distributorId:id, productId:id, quantity:1, amount:1 },
    ExpensePlan: { distributorId:id, name:'security-test', amount:1 },
    DistributorExpense: { date:new Date(), distributorId:id },
    DistributionGeneralExpense: { date:new Date(), category:'security-test', amount:1 },
    CashFlow: { date:new Date(), type:'out', amount:1 },
  };
  for (const [table, data] of Object.entries(rows)) {
    const entries = Object.entries({ id, ...data });
    await client.query(`INSERT INTO public.${quote(table)} (${entries.map(([k])=>quote(k)).join(',')}) VALUES (${entries.map((_,i)=>'$'+(i+1)).join(',')})`, entries.map(([,v])=>v));
    assert.equal((await client.query(`SELECT id FROM public.${quote(table)} WHERE id=$1`, [id])).rowCount, 1);
    assert.equal((await client.query(`UPDATE public.${quote(table)} SET id=id WHERE id=$1`, [id])).rowCount, 1);
  }
  for (const table of Object.keys(rows).reverse()) {
    assert.equal((await client.query(`DELETE FROM public.${quote(table)} WHERE id=$1`, [id])).rowCount, 1);
  }
  console.log('PASS: migration idempotence, RLS on 10 tables, 100 denied API-role operations, server CRUD on all 10 tables');
} finally {
  await client.query('ROLLBACK');
  await client.end();
}
