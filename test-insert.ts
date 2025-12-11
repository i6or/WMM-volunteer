import { config } from 'dotenv';
config();

import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // Try a direct SQL insert
  const result = await sql`
    INSERT INTO workshops (id, salesforce_id, name, title, description, date, start_time, end_time, location, status, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'TEST_WORKSHOP_123',
      'Test Workshop Name',
      'Test Workshop Title',
      'Test description',
      NOW(),
      '9:00 AM',
      '5:00 PM',
      'Virtual',
      'scheduled',
      NOW(),
      NOW()
    )
    RETURNING id, name, title
  `;
  console.log('Insert result:', result);

  // Clean up test
  await sql`DELETE FROM workshops WHERE salesforce_id = 'TEST_WORKSHOP_123'`;
  console.log('Test workshop deleted');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
