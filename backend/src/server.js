require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");

// Simple home route for connection testing
app.get("/", (req, res) => res.send("GrindLock API Grid Online."));

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

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`[GrindLock] Neural link established: ${socket.id}`);
  
  socket.on("authenticate", (userId) => {
    socket.join(userId);
    console.log(`[GrindLock] User ${userId} authenticated and joined private channel.`);
  });

  socket.on("join-room", (data) => {
    const roomId = typeof data === "string" ? data : data.roomId;
    socket.join(roomId);
    console.log(`[GrindLock] Socket joined synchronized target: ${roomId}`);
  });

  socket.on("room-action", (data) => {
    const { roomId, action, ...rest } = data;
    if (roomId) {
      io.to(roomId).emit("room-action", { action, ...rest });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[GrindLock] Neural link severed: ${socket.id}`);
  });
});

const start = async () => {
  await connectDB();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[GrindLock] Real-Time Engine active on port ${PORT} (Neural Interface: 0.0.0.0)`);
  });
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});