import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  Box,
  Button,
  Container,
  Stack,
  TextField,
  Typography,
  Paper,
} from "@mui/material";

const App = () => {
  const socket = useMemo(
    () =>
      io("http://localhost:3000", {
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
  const [incomingCall, setIncomingCall] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);

  useEffect(() => {
    socket.on("connect", () => {
      setSocketId(socket.id);
    });

    socket.on("receive-message", (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    socket.on("video-call", async ({ from, signalData }) => {
      setIncomingCall({ from, signalData });
    });

    socket.on("call-accepted", async ({ signalData }) => {
      if (!peerConnection.current) createPeer();
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signalData));
      }
    });

    socket.on("ice-candidate", ({ candidate }) => {
      if (candidate && peerConnection.current) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("call-ended", () => {
      endCallLocally();
    });

    socket.on("disconnect", () => {
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
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
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
    socket.emit("video-call", { to: room, from: socket.id, signalData: offer });
  };

  const answerCall = async () => {
    if (!incomingCall) return;
    createPeer();
    setCallStarted(true);
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingCall.signalData));
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    socket.emit("accept-call", { to: incomingCall.from, signalData: answer });
    setIncomingCall(null);
  };

  const endCallLocally = () => {
    setCallStarted(false);
    setIncomingCall(null);
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
  };

  const endCall = () => {
    socket.emit("end-call", { to: room });
    endCallLocally();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: "url('https://static.vecteezy.com/system/resources/previews/006/468/812/non_2x/chat-bubble-icons-or-speech-bubbles-sign-symbol-on-blue-pastel-background-concept-of-chat-communication-or-dialogue-3d-rendering-illustration-photo.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        paddingTop: 6,
        paddingBottom: 6,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.95)" }}>
          <Typography variant="h5" align="center" gutterBottom>
            🔐 Room & Chat System
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" align="center" gutterBottom>
            Socket ID: {socketID || "Not Connected"}
          </Typography>

          <form onSubmit={joinRoomHandler}>
            <TextField
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              label="Room Name"
              variant="outlined"
              fullWidth
              margin="normal"
            />
            <Button type="submit" variant="contained" fullWidth>
              Join Room
            </Button>
          </form>

          {room && !callStarted && !incomingCall && (
            <Button onClick={startCall} variant="contained" color="secondary" fullWidth sx={{ mt: 2 }}>
              📞 Start Video Call
            </Button>
          )}

          {incomingCall && !callStarted && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1">📲 Incoming call...</Typography>
              <Button variant="contained" color="success" fullWidth onClick={answerCall}>
                ✅ Answer
              </Button>
            </Box>
          )}

          <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
            <TextField
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              label="Message"
              variant="outlined"
              fullWidth
              margin="normal"
            />
            <Button type="submit" variant="contained" fullWidth>
              Send Message
            </Button>
          </form>

          <Stack spacing={1} sx={{ marginTop: 3 }}>
  <Typography variant="h6">💬 Messages</Typography>
  {messages.length === 0 ? (
    <Typography color="text.secondary">No messages yet</Typography>
  ) : (
    messages.map((m, i) => {
      const isSender = typeof m === "string" && m.startsWith("Me:");
      return (
        <Box
          key={i}
          sx={{
            display: "flex",
            justifyContent: isSender ? "flex-start" : "flex-end",
          }}
        >
          <Box
            sx={{
              bgcolor: isSender ? "#e0f7fa" : "#c8e6c9",
              px: 2,
              py: 1,
              borderRadius: 2,
              maxWidth: "80%",
              wordBreak: "break-word",
            }}
          >
            <Typography variant="body2">
              {m}
            </Typography>
          </Box>
        </Box>
      );
    })
  )}
</Stack>


          {callStarted && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6">🎥 Video Call:</Typography>
              <video ref={localVideoRef} autoPlay muted playsInline width="100%" style={{ marginBottom: 10, borderRadius: 8 }} />
              <video ref={remoteVideoRef} autoPlay playsInline width="100%" style={{ borderRadius: 8 }} />
              <Button variant="contained" color="error" onClick={endCall} fullWidth sx={{ mt: 2 }}>
                ❌ End Call
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default App;
