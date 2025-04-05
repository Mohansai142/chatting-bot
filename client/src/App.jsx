import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  Box,
  Button,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const App = () => {
  const socket = useMemo(() =>
    io("http://192.168.29.241:3000", {
      withCredentials: true,
      transports: ["websocket"],
    }), []);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState("");
  const [socketID, setSocketId] = useState("");
  const [roomName, setRoomName] = useState("");

  useEffect(() => {
    socket.on("connect", () => {
      setSocketId(socket.id);
      console.log("✅ Connected:", socket.id);
    });

    socket.on("receive-message", (data) => {
      console.log("📩 Message Received:", data);
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected");
      setSocketId("");
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || !room.trim()) return;

    socket.emit("message", { message, room });
    setMessages((prev) => [...prev, `Me: ${message}`]);
    setMessage("");
  };

  const joinRoomHandler = (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    socket.emit("join-room", roomName);
    setRoom(roomName);
    setRoomName("");
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ height: 30 }} />
      <Typography variant="h6" component="div" gutterBottom>
        🆔 WebSocket ID: {socketID || "Not Connected"}
      </Typography>

      <form onSubmit={joinRoomHandler} style={{ marginBottom: "10px" }}>
        <Typography variant="h6">🔹 Join Room</Typography>
        <TextField
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          label="Room Name"
          variant="outlined"
          fullWidth
          margin="normal"
        />
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Join
        </Button>
      </form>

      {room && <Typography variant="h6">📢 Room: {room}</Typography>}

      <form onSubmit={handleSubmit} style={{ marginBottom: "10px" }}>
        <Typography variant="h6">💬 Send a Message</Typography>
        <TextField
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          label="Message"
          variant="outlined"
          fullWidth
          margin="normal"
        />
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Send
        </Button>
      </form>

      <Stack spacing={1} sx={{ marginTop: 2 }}>
        <Typography variant="h6">📜 Chat Messages:</Typography>
        {messages.length === 0 ? (
          <Typography color="text.secondary">No messages yet</Typography>
        ) : (
          messages.map((m, i) => (
            <Typography key={i} variant="body1">
              {m}
            </Typography>
          ))
        )}
      </Stack>
    </Container>
  );
};

export default App;
