const rooms = {};

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 26)]).join('');
  } while (rooms[code]);
  return code;
}

function createRoom(socketId, username) {
  const code = generateCode();
  rooms[code] = {
    hostId: socketId,
    players: [{ id: socketId, username }],
    colorChoice: 'white',
    started: false
  };
  return code;
}

function joinRoom(code, socketId, username) {
  const room = rooms[code];
  if (!room || room.players.length >= 2) return false;
  room.players.push({ id: socketId, username });
  return true;
}

function setColor(code, color) {
  if (rooms[code]) rooms[code].colorChoice = color;
}

function startGame(code) {
  if (rooms[code]) rooms[code].started = true;
}

function getRoomState(code) {
  const r = rooms[code];
  return r ? {
    players: r.players.map(p => p.username),
    colorChoice: r.colorChoice,
    started: r.started,
    hostId: r.hostId
  } : null;
}

module.exports = {
  createRoom, joinRoom, setColor, startGame, getRoomState
};
