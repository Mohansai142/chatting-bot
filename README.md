# 🌐 Local Network Chat Application

A real-time chat application built using **React** for the frontend and **Express + Socket.IO** for the backend. The app supports joining chat rooms and exchanging messages between users **connected to the same network**.

---

## 📁 Project Structure


---

## ⚙️ Features

- 🔒 JWT authentication using cookies
- 🧑‍🤝‍🧑 Join chat rooms
- 💬 Real-time messaging
- ⚡ Built with `Socket.IO` (WebSocket transport)
- 🌐 Works on **local network only**

---

## 🚀 Getting Started

### 📌 Prerequisites

- Node.js (v16+)
- npm or yarn
- Devices should be on the **same Wi-Fi or LAN**

---

### 📥 Clone the Repository

```bash
git clone https://github.com/your-username/slumber-sync-dreams.git
cd slumber-sync-dreams


cd server
npm install
node index.js


GET http://192.168.xx.xx:3000/login

WebSocket Events
Client → Server
join-room – Join a specific chat room

message – Send a message to a room

Server → Client
receive-message – Receive a message from other users in the room
