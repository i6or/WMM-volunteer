import { salesforceService } from './services/salesforce.js';

async function testSync() {
  console.log("=== Testing V4S Sync ===\n");
  
  try {
    const opportunities = await salesforceService.syncV4SOpportunities();
    
    console.log(`\nSync returned ${opportunities.length} opportunities`);
    
    if (opportunities.length > 0) {
      console.log("\nFirst opportunity:");
      console.log(JSON.stringify(opportunities[0], null, 2));
    }
  } catch (error) {
    console.error("Sync failed with error:", error);
  }
}

testSync().catch(console.error);