const fetch = require('node-fetch');

async function testRegister() {
    const email = `test_${Date.now()}@example.com`;
    const password = 'password123';
    const name = 'Test User';

    try {
        const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        console.log('Register Status:', res.status);
        const data = await res.json();
        console.log('Register Data:', data);
    } catch (e) {
        console.error('Register Error:', e.message);
    }
}

testRegister();
