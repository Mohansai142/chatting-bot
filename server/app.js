import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const app = express();
const server = createServer(app);
const port = 3000;
const secretKeyJWT = "asdasdsadasdasdasdsa";

// 🔐 Allowed frontend origin (change IP as per your machine)
const FRONTEND_ORIGIN = "http://192.168.29.241:5173";

// 🧩 Middleware Setup
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(cookieParser());

// 📡 Socket.IO server setup
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket"],
  allowEIO3: true,
});

// 🌍 Routes
app.get("/", (req, res) => {
  res.send("🌐 Socket.IO + JWT Server is running!");
});

app.get("/login", (req, res) => {
  const token = jwt.sign({ _id: "user123" }, secretKeyJWT, {
    expiresIn: "1h",
  });

  res
    .cookie("token", token, {
      httpOnly: true,
      secure: true, // Set to true if using HTTPS
      sameSite: "none",
    })
    .json({ message: "✅ Login Successful", token });
});

// 🛡️ Socket.IO Middleware: JWT Authentication
io.use((socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || "";
    const token = cookieHeader
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return next(new Error("❌ Authentication Error: Token missing"));
    }

    jwt.verify(token, secretKeyJWT);
    next();
  } catch (err) {
    return next(new Error("❌ Authentication Error: Invalid token"));
  }
});

// ⚡ Socket.IO Events
io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  // Room join
  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`🏠 ${socket.id} joined room: ${room}`);
  });

  // Message sending
  socket.on("message", ({ room, message }) => {
    console.log(`💬 [${room}] ${socket.id}: ${message}`);
    socket.to(room).emit("receive-message", message);
  });

  // 📹 Video call initiation
  socket.on("video-call", ({ to, signalData }) => {
    console.log(`📞 Video call from ${socket.id} to ${to}`);
    io.to(to).emit("video-call", {
      from: socket.id,
      signalData,
    });
  });

  // 📲 Accepting call
  socket.on("accept-call", ({ to, signalData }) => {
    console.log(`📞 Call accepted by ${socket.id} for ${to}`);
    io.to(to).emit("call-accepted", {
      from: socket.id,
      signalData,
    });
  });

  // ❄️ ICE candidates (optional for WebRTC setup)
  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  // 🛑 Call end handler
  socket.on("end-call", ({ to }) => {
    console.log(`🔕 Call ended by ${socket.id}, notifying ${to}`);
    io.to(to).emit("call-ended");
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
  });
});

// 🚀 Server start (binding to all interfaces)
server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${port}`);
});
