import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const secretKeyJWT = "asdasdsadasdasdasdsa";
const port = 3000;

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://192.168.29.241:5173", // Use your computer's IP address
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket"],
  allowEIO3: true,
});

app.use(
  cors({
    origin: "http://192.168.29.241:5173",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/login", (req, res) => {
  const token = jwt.sign({ _id: "asdasjdhkasdasdas" }, secretKeyJWT, {
    expiresIn: "1h",
  });

  res
    .cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    })
    .json({ message: "Login Success" });
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.headers.cookie
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!token) return next(new Error("Authentication Error"));

    jwt.verify(token, secretKeyJWT);
    next();
  } catch (err) {
    next(new Error("Authentication Error"));
  }
});

io.on("connection", (socket) => {
  console.log("🔥 User Connected:", socket.id);

  socket.on("message", ({ room, message }) => {
    console.log({ room, message });
    socket.to(room).emit("receive-message", message);
  });

  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`✅ User joined room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ User Disconnected:", socket.id);
  });
});

// Important change: Bind to 0.0.0.0 to allow network access
server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
});
