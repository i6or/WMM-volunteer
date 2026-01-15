import 'dotenv/config';
import { db } from './server/db';
import { programs } from './shared/schema';

async function listPrograms() {
  const allPrograms = await db.select({
    id: programs.id,
    name: programs.name,
    startDate: programs.startDate,
    status: programs.status,
    salesforceId: programs.salesforceId
  }).from(programs).orderBy(programs.startDate);

  console.log('All programs in database:\n');
  allPrograms.forEach(p => {
    const year = p.startDate ? new Date(p.startDate).getFullYear() : 'No date';
    const status = (p.status || 'unknown').padEnd(10);
    const name = (p.name || 'No name').substring(0, 50).padEnd(50);
    console.log(`[${year}] ${status} | ${name} | ${p.id}`);
  });
  console.log(`\nTotal: ${allPrograms.length} programs`);
  process.exit(0);
}

listPrograms();
