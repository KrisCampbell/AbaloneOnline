import React, { useState } from 'react';
import HomePage from './components/HomePage';
import LobbyPage from './components/LobbyPage';

export default function App() {
  const [session, setSession] = useState(null);

  return session
    ? <LobbyPage {...session} />
    : <HomePage onJoin={setSession} />;
}
