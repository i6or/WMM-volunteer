// API Connection Test Script (ES Module)
// Run with: node test-api.mjs

import http from 'http';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

const endpoints = [
  { path: '/api/health', name: 'Health Check' },
  { path: '/api/version', name: 'Version Check' },
  { path: '/api/debug/db-connection', name: 'Database Connection' },
  { path: '/api/programs', name: 'Programs List' },
  { path: '/api/workshops', name: 'Workshops List' },
];

function testEndpoint(path, name) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname,
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          parsedData = data;
        }
        
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          data: parsedData,
          rawData: data.substring(0, 200),
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        statusCode: null,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        statusCode: null,
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n=== API Connection Test ===\n');
  console.log(`Testing API at: ${BASE_URL}\n`);

  const results = [];

  for (const endpoint of endpoints) {
    process.stdout.write(`Testing ${endpoint.name} (${endpoint.path})... `);
    const result = await testEndpoint(endpoint.path, endpoint.name);
    results.push({ ...endpoint, ...result });

    if (result.success) {
      console.log(`✓ OK (${result.statusCode})`);
    } else if (result.statusCode) {
      console.log(`✗ Failed (${result.statusCode})`);
    } else {
      console.log(`✗ Connection Error: ${result.error}`);
    }
  }

  console.log('\n=== Detailed Results ===\n');

  results.forEach((result) => {
    console.log(`\n${result.name} (${result.path}):`);
    console.log(`  Status: ${result.statusCode || 'N/A'}`);
    
    if (result.success) {
      const responseStr = JSON.stringify(result.data, null, 2);
      console.log(`  Response: ${responseStr.substring(0, 300)}`);
    } else if (result.error) {
      console.log(`  Error: ${result.error}`);
    } else if (result.data) {
      const responseStr = JSON.stringify(result.data, null, 2);
      console.log(`  Response: ${responseStr.substring(0, 300)}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${successCount}/${totalCount}`);
  
  if (successCount === 0) {
    console.log('\n⚠️  No endpoints responded successfully.');
    console.log('   Make sure the server is running with: npm run dev');
  } else if (successCount < totalCount) {
    console.log('\n⚠️  Some endpoints failed. Check the details above.');
  } else {
    console.log('\n✓ All endpoints are working correctly!');
  }
}

runTests().catch(console.error);


