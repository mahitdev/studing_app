const fetch = require('node-fetch');

async function test() {
    try {
        const res = await fetch('http://localhost:5000/api/health');
        console.log('Backend Health Status:', res.status);
        const data = await res.json();
        console.log('Backend Health Data:', data);
    } catch (e) {
        console.error('Backend Health Error:', e.message);
    }
}

test();
