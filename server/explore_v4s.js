import { salesforceService } from './services/salesforce.js';

async function exploreV4S() {
  console.log("=== Exploring V4S Volunteer Jobs ===\n");

  // Query Volunteer Jobs
  const jobsQuery = await salesforceService.queryObject('GW_Volunteers__Volunteer_Job__c', 10);
  
  if (jobsQuery.success) {
    console.log(`Found ${jobsQuery.totalSize || 0} Volunteer Jobs:\n`);
    jobsQuery.records?.forEach(job => {
      console.log(`Job: ${job.Name || 'Unnamed'}`);
      console.log(`  ID: ${job.Id}`);
      console.log(`  Campaign: ${job.GW_Volunteers__Campaign__c || 'None'}`);
      console.log(`  Display on Website: ${job.GW_Volunteers__Display_on_Website__c || false}`);
      console.log(`  Description: ${job.GW_Volunteers__Description__c || 'No description'}`);
      console.log(`  Location: ${job.GW_Volunteers__Location__c || 'Not specified'}`);
      console.log(`  Skills Needed: ${job.GW_Volunteers__Skills_Needed__c || 'None'}`);
      console.log('---');
    });
  } else {
    console.log("Failed to query Volunteer Jobs:", jobsQuery.message);
  }

  // Query Volunteer Shifts
  console.log("\n=== Checking Volunteer Shifts ===\n");
  const shiftsQuery = await salesforceService.queryObject('GW_Volunteers__Volunteer_Shift__c', 10);
  
  if (shiftsQuery.success) {
    console.log(`Found ${shiftsQuery.totalSize || 0} Volunteer Shifts:\n`);
    shiftsQuery.records?.forEach(shift => {
      console.log(`Shift: ${shift.Name || 'Unnamed'}`);
      console.log(`  Job: ${shift.GW_Volunteers__Volunteer_Job__c}`);
      console.log(`  Start: ${shift.GW_Volunteers__Start_Date_Time__c}`);
      console.log(`  Duration: ${shift.GW_Volunteers__Duration__c} hours`);
      console.log(`  Total Volunteers Needed: ${shift.GW_Volunteers__Total_Volunteers__c}`);
      console.log(`  Still Needed: ${shift.GW_Volunteers__Number_of_Volunteers_Still_Needed__c}`);
      console.log('---');
    });
  } else {
    console.log("Failed to query Volunteer Shifts:", shiftsQuery.message);
  }

  // Check for existing Program connections
  console.log("\n=== Checking for Program Connections ===\n");
  const programQuery = await salesforceService.queryObject('Program__c', 5);
  if (programQuery.success) {
    console.log(`Found ${programQuery.totalSize || 0} Programs`);
    programQuery.records?.forEach(p => {
      console.log(`  - ${p.Name} (${p.Id})`);
    });
  }

  // Query Volunteer Hours (signups)
  console.log("\n=== Checking Volunteer Hours (Signups) ===\n");
  const hoursQuery = await salesforceService.queryObject('GW_Volunteers__Volunteer_Hours__c', 5);
  
  if (hoursQuery.success) {
    console.log(`Found ${hoursQuery.totalSize || 0} Volunteer Hour records:\n`);
    hoursQuery.records?.forEach(hour => {
      console.log(`Signup: ${hour.Name || 'Unnamed'}`);
      console.log(`  Contact: ${hour.GW_Volunteers__Contact__c}`);
      console.log(`  Status: ${hour.GW_Volunteers__Status__c}`);
      console.log(`  Hours: ${hour.GW_Volunteers__Hours_Worked__c || 0}`);
      console.log('---');
    });
  }
}

exploreV4S().catch(console.error);