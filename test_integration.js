import { salesforceService } from './server/services/salesforce.js';

async function testSalesforceIntegration() {
  console.log('Testing Salesforce connection...');
  
  try {
    // Test connection
    const connectionResult = await salesforceService.testConnection();
    console.log('Connection test result:', connectionResult);
    
    if (connectionResult.success) {
      console.log('✅ Salesforce connection successful!');
      
      // Test V4S sync
      console.log('Testing V4S opportunities sync...');
      const opportunities = await salesforceService.syncV4SOpportunities();
      console.log(`✅ Found ${opportunities.length} opportunities`);
      
      if (opportunities.length > 0) {
        console.log('Sample opportunity:', opportunities[0]);
      }
    } else {
      console.log('❌ Salesforce connection failed:', connectionResult.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSalesforceIntegration();
