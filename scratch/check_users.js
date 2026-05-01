const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const userCount = await mongoose.connection.db.collection('users').countDocuments();
        console.log('User count:', userCount);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
