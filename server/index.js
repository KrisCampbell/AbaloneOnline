const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createRoom, joinRoom, setColor, startGame } = require('./gameRooms');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  socket.on('host_game', ({ username }, cb) => {
    const code = createRoom(socket.id, username);
    socket.join(code);
    cb({ code });
    io.to(code).emit('lobby_update', getRoomState(code));
  });

  socket.on('join_game', ({ username, code }, cb) => {
    const success = joinRoom(code, socket.id, username);
    if (!success) return cb({ error: 'Invalid or full room' });
    socket.join(code);
    cb({ success: true });
    io.to(code).emit('lobby_update', getRoomState(code));
  });

  socket.on('set_color', ({ code, color }) => {
    setColor(code, color);
    io.to(code).emit('lobby_update', getRoomState(code));
  });

  socket.on('start_game', ({ code }) => {
    startGame(code);
    io.to(code).emit('game_start');
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} disconnected`);
    // Handle disconnection cleanup here later
  });
});

server.listen(3001, () => console.log(`🛰️ Server running on port 3001`));

// Export shared functions
const { getRoomState } = require('./gameRooms');
