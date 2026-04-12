const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("⚠️ MONGODB_URI not found in env. Falling back to local default.");
  }

  const finalUri = uri || "mongodb://localhost:27017/study-tracker";

  try {
    await mongoose.connect(finalUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ MongoDB connected to: ${finalUri.includes("@") ? finalUri.split("@")[1].split("/")[0] : finalUri}`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    if (!uri) {
      console.error("💡 TIP: Make sure your local MongoDB is running or provide a valid MONGODB_URI in .env");
    }
    throw err;
  }
};

module.exports = connectDB;
