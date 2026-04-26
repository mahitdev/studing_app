require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust in production
    methods: ["GET", "POST"]
  }
});

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "focusflow-dev-secret-change-in-production") {
    console.error("FATAL ERROR: Insecure or missing JWT_SECRET in production.");
    process.exit(1);
  }
}

// Attach IO to app for access in routes
app.set("io", io);

io.on("connection", (socket) => {
  console.log(`[GrindLock] Neural link established: ${socket.id}`);
  
  socket.on("join-room", (userId) => {
    socket.join(userId);
    console.log(`[GrindLock] User ${userId} synchronized with room.`);
  });

  socket.on("disconnect", () => {
    console.log(`[GrindLock] Neural link severed: ${socket.id}`);
  });
});

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`[GrindLock] Real-Time Engine active on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});