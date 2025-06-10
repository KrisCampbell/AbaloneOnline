import React, { useEffect, useState } from 'react';
import { socket } from '../socket';

export default function LobbyPage({ code, username, isHost }) {
  const [players, setPlayers] = useState([]);
  const [color, setColor] = useState('white');

  useEffect(() => {
    socket.on('lobby_update', ({ players, colorChoice }) => {
      setPlayers(players);
      setColor(colorChoice);
    });

    socket.on('game_start', () => {
      alert("Game starting! 🚀");
      // Transition to game board component here
    });

    return () => {
      socket.off('lobby_update');
      socket.off('game_start');
    };
  }, []);

  const changeColor = (c) => {
    socket.emit('set_color', { code, color: c });
  };

  const startGame = () => {
    socket.emit('start_game', { code });
  };

  return (
    <div>
      <h2>Lobby: {code}</h2>
      <p>Players: {players.join(', ')}</p>
      {isHost && (
        <>
          <select value={color} onChange={(e) => changeColor(e.target.value)}>
            <option value="white">Play as White</option>
            <option value="black">Play as Black</option>
          </select>
          <button onClick={startGame} disabled={players.length < 2}>Start Game</button>
        </>
      )}
    </div>
  );
}
