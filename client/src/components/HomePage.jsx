import React, { useState } from 'react';
import { socket } from '../socket';

export default function HomePage({ onJoin }) {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');

  const hostGame = () => {
    socket.emit('host_game', { username }, ({ code }) => {
      onJoin({ username, code, isHost: true });
    });
  };

  const joinGame = () => {
    socket.emit('join_game', { username, code: code.toUpperCase() }, (res) => {
      if (res?.error) alert(res.error);
      else onJoin({ username, code: code.toUpperCase(), isHost: false });
    });
  };

  return (
    <div>
      <h1>Abalone Online</h1>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <br />
      <button onClick={hostGame} disabled={!username}>Host Game</button>
      <br />
      <input placeholder="Join Code" value={code} onChange={e => setCode(e.target.value)} maxLength={4} />
      <button onClick={joinGame} disabled={!username || code.length !== 4}>Join Game</button>
    </div>
  );
}
