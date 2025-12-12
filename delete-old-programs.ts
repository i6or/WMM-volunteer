import 'dotenv/config';
import { db } from './server/db';
import { programs, workshops } from './shared/schema';
import { sql, lt } from 'drizzle-orm';

async function deleteOldPrograms() {
  // Delete programs from before 2025 (past calendar years)
  const cutoffDate = new Date('2025-01-01');

  console.log('Finding programs before 2025...');

  // First, find the old programs
  const oldPrograms = await db.select({
    id: programs.id,
    name: programs.name,
    startDate: programs.startDate,
    status: programs.status,
  }).from(programs).where(lt(programs.startDate, cutoffDate));

  console.log(`Found ${oldPrograms.length} programs before 2025:`);
  oldPrograms.forEach(p => {
    const year = p.startDate ? new Date(p.startDate).getFullYear() : 'No date';
    console.log(`  [${year}] ${p.name} - ${p.id}`);
  });

  if (oldPrograms.length === 0) {
    console.log('No old programs to delete.');
    process.exit(0);
  }

  // Delete workshops associated with old programs first (foreign key constraint)
  const programIds = oldPrograms.map(p => p.id);
  console.log(`\nDeleting workshops from ${programIds.length} old programs...`);

  for (const programId of programIds) {
    const deleted = await db.delete(workshops).where(sql`${workshops.programId} = ${programId}`);
    console.log(`  Deleted workshops for program ${programId}`);
  }

  // Now delete the old programs
  console.log('\nDeleting old programs...');
  const result = await db.delete(programs).where(lt(programs.startDate, cutoffDate));

  console.log(`\nDone! Deleted ${oldPrograms.length} programs from before 2025.`);
  process.exit(0);
}

deleteOldPrograms().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
