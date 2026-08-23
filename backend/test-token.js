const jwt = require('jsonwebtoken');
const http = require('http');

// Generate token for tfivy (user ID: 3a1370cb-189c-481d-800b-6081b2976b7c, shopId: a6f6251c-d1cc-485d-97aa-4c63f67984cf)
const payload = { 
    username: 'tfivy', 
    sub: '3a1370cb-189c-481d-800b-6081b2976b7c', 
    role: 'user',
    shopId: 'a6f6251c-d1cc-485d-97aa-4c63f67984cf'
};
const token = jwt.sign(payload, 'whatsup_super_secret');

console.log('Token generated, making request...');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/shops/me',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer ' + token
    }
};

const req = http.request(options, (res) => {
    let data = '';
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => { console.log(`BODY: ${data}`); });
});

req.on('error', (e) => { console.error(`problem with request:`, e); });
req.end();
