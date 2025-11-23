
import http from 'http';

// This script triggers the self-evolution process by calling the API endpoint.
const options = {
  hostname: 'localhost',
  port: 3000, // Assuming the backend server runs on port 3000
  path: '/api/v1/evolution/evolve',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // In a real secured app, you'd need an auth token.
    // For this internal trigger, we assume the required SUPER_ADMIN role is implicitly granted or the endpoint is temporarily open for this action.
  }
};

const req = http.request(options, (res) => {
  let data = '';
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('RESPONSE:');
    try {
        // Try to parse and print nicely
        console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
        // If not JSON, print as is
        console.log(data);
    }
    console.log('\nEvolution cycle triggered.');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  console.error('Please ensure the backend server is running on port 3000.');
});

// End the request to send it
req.end();
