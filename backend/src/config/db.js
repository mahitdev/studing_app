const mongoose = require("mongoose");

const { MongoMemoryServer } = require("mongodb-memory-server");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("⚠️ MONGODB_URI not found in env. Falling back to local default.");
  }

  const finalUri = uri || "mongodb://localhost:27017/study-tracker";

  try {
    await mongoose.connect(finalUri, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`✅ MongoDB connected to: ${finalUri.includes("@") ? finalUri.split("@")[1].split("/")[0] : finalUri}`);
  } catch (err) {
    console.warn(`⚠️ MongoDB connection to ${finalUri} failed. Falling back to in-memory database...`);
    try {
      const mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`✅ MongoDB (In-Memory) connected to: ${memoryUri}`);
    } catch (memErr) {
      console.error("❌ Failed to start in-memory MongoDB:", memErr.message);
      throw err;
    }
  }
};

module.exports = connectDB;
