const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.odejolwlygfcjidvjzds:WDrtlZ8WZEET4oUC@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres",
});

async function main() {
  const res = await pool.query('SELECT id, email, name, role FROM "User"');
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main().catch(console.error);
