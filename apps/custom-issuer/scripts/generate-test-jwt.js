#!/usr/bin/env node

/**
 * Script to generate random JWTs and send them to the custom-issuer service
 * 
 * Usage:
 *   node scripts/generate-test-jwt.js [options]
 * 
 * Options:
 *   --count, -c    Number of JWTs to generate (default: 1)
 *   --sub, -s      Subject claim value (default: random email)
 *   --exp, -e      Expiration in seconds from now (default: 3600)
 *   --nbf, -n      Not before in seconds from now (default: 0)
 *   --url, -u      Service URL (default: http://localhost:3000)
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  count: 1,
  sub: null,
  exp: 3600,
  nbf: 0,
  url: 'http://localhost:3000',
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--count':
    case '-c':
      options.count = parseInt(args[++i], 10) || 1;
      break;
    case '--sub':
    case '-s':
      options.sub = args[++i];
      break;
    case '--exp':
    case '-e':
      options.exp = parseInt(args[++i], 10) || 3600;
      break;
    case '--nbf':
    case '-n':
      options.nbf = parseInt(args[++i], 10) || 0;
      break;
    case '--url':
    case '-u':
      options.url = args[++i] || 'http://localhost:3000';
      break;
    case '--help':
    case '-h':
      console.log(`
Generate random JWTs and send them to the custom-issuer service.

Usage:
  node scripts/generate-test-jwt.js [options]

Options:
  --count, -c    Number of JWTs to generate and send (default: 1)
  --sub, -s      Subject claim value (default: random email)
  --exp, -e      Expiration in seconds from now (default: 3600)
  --nbf, -n      Not before in seconds from now (default: 0)
  --url, -u      Service URL (default: http://localhost:3000)
  --help, -h     Show this help message

Examples:
  # Generate and send a single JWT
  node scripts/generate-test-jwt.js

  # Generate and send 5 JWTs with custom subject
  node scripts/generate-test-jwt.js --count 5 --sub "user@example.com"

  # Generate JWT with custom expiration (2 hours)
  node scripts/generate-test-jwt.js --exp 7200

  # Generate JWT with not-before claim
  node scripts/generate-test-jwt.js --nbf -60

  # Send to custom service URL
  node scripts/generate-test-jwt.js --url http://localhost:8080
      `);
      process.exit(0);
      break;
  }
}

// Load the signing private key (corresponds to validation public key)
const keyPath = process.env.KEY_PATH || path.join(__dirname, '../keys/signing-key.pem');

if (!fs.existsSync(keyPath)) {
  console.error(`Error: Key file not found at ${keyPath}`);
  console.error('Please set KEY_PATH environment variable or place signing-key.pem in keys/ directory');
  process.exit(1);
}

const privateKey = fs.readFileSync(keyPath, 'utf-8');

// Generate random email for subject if not provided
function generateRandomEmail() {
  const adjectives = ['happy', 'cool', 'smart', 'fast', 'bright', 'quick', 'bold', 'calm'];
  const nouns = ['user', 'admin', 'tester', 'developer', 'guest', 'member', 'visitor'];
  const domains = ['example.com', 'test.com', 'demo.org', 'sample.net'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const number = Math.floor(Math.random() * 10000);
  
  return `${adjective}.${noun}${number}@${domain}`;
}

// Generate a JWT
function generateJWT(sub, exp, nbf) {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    sub: sub || generateRandomEmail(),
    iat: now,
  };

  // Add exp claim if specified
  if (exp !== null && exp !== undefined) {
    payload.exp = now + exp;
  }

  // Add nbf claim if specified
  if (nbf !== null && nbf !== undefined) {
    payload.nbf = now + nbf;
  }

  // Sign the JWT
  const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
  });

  return { token, payload };
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
            body: parsed,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
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

// Generate and send JWTs
(async () => {
  for (let i = 0; i < options.count; i++) {
    const sub = options.sub || generateRandomEmail();
    const result = generateJWT(sub, options.exp, options.nbf);
    
    console.log(`\n${options.count > 1 ? `--- JWT ${i + 1} ---` : '--- Generated JWT ---'}`);
    console.log('Payload:', JSON.stringify(result.payload, null, 2));
    console.log('Token:', result.token);
    
    try {
      console.log(`\nSending to ${options.url}/issuer/issue...`);
      const response = await sendJWTToService(result.token, options.url);
      
      if (response.statusCode === 200) {
        console.log('✓ Success! Response:');
        console.log(JSON.stringify(response.body, null, 2));
      } else {
        console.error(`✗ Error (${response.statusCode}):`);
        console.error(JSON.stringify(response.body, null, 2));
      }
    } catch (error) {
      console.error('✗ Failed to send JWT:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.error(`  Make sure the service is running at ${options.url}`);
      }
    }
    
    if (i < options.count - 1) {
      console.log('\n' + '='.repeat(80));
    }
  }
})();
