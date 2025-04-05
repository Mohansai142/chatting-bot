import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const socket = useMemo(
    () =>
      io("http://192.168.29.241:3000", {
        withCredentials: true,
        transports: ["websocket"],
      }),
    []
  );

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState("");
  const [socketID, setSocketId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [callStarted, setCallStarted] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);

  useEffect(() => {
    socket.on("connect", () => {
      setSocketId(socket.id);
      console.log("✅ Connected:", socket.id);
    });

    socket.on("receive-message", (data) => {
      console.log("📩 Message Received:", data);
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    socket.on("call-made", async ({ offer, socket: callerID }) => {
      console.log("📞 Incoming Call");

      if (!peerConnection.current) createPeer();
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit("make-answer", { answer, to: callerID });
    });

    socket.on("answer-made", async ({ answer }) => {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", ({ candidate }) => {
      if (candidate) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("video-call", async ({ from, signalData }) => {
      console.log("📹 Received offer from:", from);
      if (!peerConnection.current) createPeer();

      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signalData));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit("accept-call", { to: from, signalData: answer });
    });

    socket.on("call-accepted", async ({ signalData }) => {
      console.log("📞 Call accepted");
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signalData));
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

  const createPeer = () => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { candidate: event.candidate, to: room });
      }
    };

    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });
    });
  };

  const startCall = async () => {
    createPeer();
    setCallStarted(true);

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.emit("video-call", {
      to: room,
      signalData: offer,
    });
  };

  const endCall = () => {
    setCallStarted(false);

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current?.srcObject) {
      remoteVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      remoteVideoRef.current.srcObject = null;
    }

    socket.emit("end-call", { to: room }); // Optional
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ height: 30 }} />
      <Typography variant="h6" gutterBottom>
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
        <Button type="submit" variant="contained" fullWidth>
          Join
        </Button>
      </form>

      {room && (
        <>
          <Typography variant="h6">📢 Room: {room}</Typography>
          <Button
            onClick={startCall}
            variant="contained"
            color="secondary"
            fullWidth
            style={{ marginBottom: "10px" }}
            disabled={callStarted}
          >
            📞 Start Video Call
          </Button>
        </>
      )}

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
        <Button type="submit" variant="contained" fullWidth>
          Send
        </Button>
      </form>

      <Stack spacing={1} sx={{ marginTop: 2 }}>
        <Typography variant="h6">📜 Chat Messages:</Typography>
        {messages.length === 0 ? (
          <Typography color="text.secondary">No messages yet</Typography>
        ) : (
          messages.map((m, i) => <Typography key={i}>{m}</Typography>)
        )}
      </Stack>

      {callStarted && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">🎥 Video Call:</Typography>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            width="100%"
            style={{ marginBottom: 10 }}
          />
          <video ref={remoteVideoRef} autoPlay playsInline width="100%" />

          <Button
            variant="contained"
            color="error"
            onClick={endCall}
            fullWidth
            sx={{ mt: 2 }}
          >
            ❌ End Call
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default App;
