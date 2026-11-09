/** One-time local PostgreSQL constraint fix for YooKassa canceled status. */
import 'dotenv/config';
import { Client } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is missing');
const parsed = new URL(url);
if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
  throw new Error('REFUSED: only a local PostgreSQL server is permitted');
}
const client = new Client({ connectionString: url });
try {
  await client.connect();
  await client.query('BEGIN');
  const result = await client.query<{ definition: string }>(`
    SELECT pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'public.order_payments'::regclass
      AND conname = 'order_payments_status_check'
      AND contype = 'c'
  `);
  if (result.rowCount !== 1) throw new Error('order_payments_status_check was not found');
  const def = result.rows[0].definition;
  if (!/^CHECK \([\s\S]*\)$/.test(def)) throw new Error('Unexpected CHECK definition: ' + def);
  if (/\bcanceled\b/.test(def)) {
    console.log('[PASS] Constraint already supports canceled');
  } else {
    const originalExpression = def.slice(7, -1);
    // Preserve every previously allowed state; add only the canceled state.
    await client.query('ALTER TABLE public.order_payments DROP CONSTRAINT order_payments_status_check');
    await client.query(`ALTER TABLE public.order_payments ADD CONSTRAINT order_payments_status_check CHECK (status = 'canceled' OR (${originalExpression}))`);
    console.log('[PASS] Allowed canceled while preserving original constraint');
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('[FAIL] Payment status constraint:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
