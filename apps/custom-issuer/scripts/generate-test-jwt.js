#!/usr/bin/env node

/**
 * Script to read a JWT from a text file and send it to the custom-issuer service
 * 
 * Usage:
 *   node scripts/generate-test-jwt.js [options] <jwt-file>
 * 
 * Options:
 *   --file, -f     Path to text file containing the JWT (required)
 *   --url, -u      Service URL (default: http://localhost:3000)
 *   --help, -h     Show this help message
 * 
 * Examples:
 *   # Send JWT from file to default service
 *   node scripts/generate-test-jwt.js --file jwt.txt
 * 
 *   # Send JWT from file to custom service URL
 *   node scripts/generate-test-jwt.js --file jwt.txt --url http://localhost:8080
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  file: null,
  url: 'http://localhost:3000',
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--file':
    case '-f':
      options.file = args[++i];
      break;
    case '--url':
    case '-u':
      options.url = args[++i] || 'http://localhost:3000';
      break;
    case '--help':
    case '-h':
      console.log(`
Read a JWT from a text file and send it to the custom-issuer service.

Usage:
  node scripts/generate-test-jwt.js [options] <jwt-file>

Options:
  --file, -f     Path to text file containing the JWT (required)
  --url, -u      Service URL (default: http://localhost:3000)
  --help, -h     Show this help message

Examples:
  # Send JWT from file to default service
  node scripts/generate-test-jwt.js --file jwt.txt

  # Send JWT from file to custom service URL
  node scripts/generate-test-jwt.js --file jwt.txt --url http://localhost:8080

  # Alternative: pass file as positional argument
  node scripts/generate-test-jwt.js jwt.txt
      `);
      process.exit(0);
      break;
    default:
      // If it doesn't start with --, treat it as a file path
      if (!arg.startsWith('--') && !options.file) {
        options.file = arg;
      }
      break;
  }
}

// Validate file path
if (!options.file) {
  console.error('Error: JWT file path is required');
  console.error('Usage: node scripts/generate-test-jwt.js --file <jwt-file>');
  console.error('       node scripts/generate-test-jwt.js <jwt-file>');
  process.exit(1);
}

// Resolve file path (support relative and absolute paths)
const jwtFilePath = path.isAbsolute(options.file)
  ? options.file
  : path.resolve(process.cwd(), options.file);

if (!fs.existsSync(jwtFilePath)) {
  console.error(`Error: JWT file not found at ${jwtFilePath}`);
  process.exit(1);
}

// Read JWT from file
let jwtToken;
try {
  jwtToken = fs.readFileSync(jwtFilePath, 'utf-8').trim();
  
  if (!jwtToken) {
    console.error('Error: JWT file is empty');
    process.exit(1);
  }
  
  // Basic validation: JWT should have 3 parts separated by dots
  const parts = jwtToken.split('.');
  if (parts.length !== 3) {
    console.error('Error: Invalid JWT format. Expected format: header.payload.signature');
    console.error(`Found ${parts.length} parts instead of 3`);
    process.exit(1);
  }
} catch (error) {
  console.error(`Error reading JWT file: ${error.message}`);
  process.exit(1);
}

// Send JWT to service
async function sendJWTToService(token, serviceUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${serviceUrl}/issuer/issue`);
    const postData = JSON.stringify({ jwt: token });

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Send JWT to service
(async () => {
  console.log('--- Sending JWT to Custom Issuer Service ---');
  console.log(`File: ${jwtFilePath}`);
  console.log(`Service URL: ${options.url}`);
  console.log(`JWT (first 50 chars): ${jwtToken.substring(0, 50)}...`);
  
  try {
    console.log(`\nSending to ${options.url}/issuer/issue...`);
    const response = await sendJWTToService(jwtToken, options.url);
    
    if (response.statusCode === 200) {
      console.log('✓ Success! Response:');
      console.log(JSON.stringify(response.body, null, 2));
      process.exit(0);
    } else {
      console.error(`✗ Error (${response.statusCode}):`);
      console.error(JSON.stringify(response.body, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Failed to send JWT:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error(`  Make sure the service is running at ${options.url}`);
    }
    process.exit(1);
  }
})();
