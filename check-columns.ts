import { config } from 'dotenv';
config();

import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'workshops'
    ORDER BY ordinal_position
  `;
  console.log('Workshops table columns:');
  for (const row of result) {
    console.log(`  - ${row.column_name}: ${row.data_type}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
