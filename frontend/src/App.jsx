import { useState } from 'react'
import './App.css'
import LoginScreen from './components/LoginScreen'
import LobbyScreen from './components/LobbyScreen'
import GameScreen from './components/GameScreen'
import SockJS from 'sockjs-client'
import Stomp from 'stompjs'

// Get backend URL from environment variables or use localhost as fallback
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
const WS_URL = import.meta.env.VITE_WS_URL || BACKEND_URL

console.log('🔗 Connecting to backend:', BACKEND_URL)

function App() {
  const [screen, setScreen] = useState('login') // 'login', 'lobby', 'game'
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState('')
  const [stompClient, setStompClient] = useState(null)
  const [mySessionId, setMySessionId] = useState('')
  const [connected, setConnected] = useState(false)

  const connectWebSocket = (callback) => {
    const socket = new SockJS(`${WS_URL}/ws`)
    const client = Stomp.over(socket)
    client.debug = null

    client.connect({}, (frame) => {
      console.log('Connected:', frame)
      
      const url = socket._transport.url
      const parts = url.split('/')
      const sessionId = parts[parts.length - 2]
      console.log('>>> Session ID extracted:', sessionId)
      setMySessionId(sessionId)
      setConnected(true)
      setStompClient(client)
      
      if (callback) callback(client, sessionId)
    }, (error) => {
      console.error('Connection error:', error)
      alert('Failed to connect to server')
    })
  }

  return (
    <div className="App">
      <h1 className="game-title">
        <span style={{color: '#FFD700'}}>S</span>
        <span style={{color: '#FFB6C1'}}>c</span>
        <span style={{color: '#87CEEB'}}>r</span>
        <span style={{color: '#FFD700'}}>i</span>
        <span style={{color: '#98FB98'}}>b</span>
        <span style={{color: '#FFB6C1'}}>b</span>
        <span style={{color: '#87CEEB'}}>l</span>
        <span style={{color: '#FFD700'}}>e</span>
        <span style={{color: '#FFB6C1'}}>r</span>
        <span style={{color: '#98FB98'}}>s</span>
      </h1>

      {screen === 'login' && (
        <LoginScreen
          username={username}
          setUsername={setUsername}
          onPlayClick={() => {
            if (!username.trim()) {
              alert('Please enter a nickname!');
              return;
            }
            connectWebSocket((client, sessionId) => {
              setScreen('lobby');
            });
          }}
        />
      )}

      {screen === 'lobby' && (
        <LobbyScreen
          stompClient={stompClient}
          username={username}
          mySessionId={mySessionId}
          onBack={() => {
            if (stompClient) stompClient.disconnect();
            setScreen('login');
            setConnected(false);
          }}
          onJoinRoom={(roomCode) => {
            setRoomId(roomCode);
            setScreen('game');
          }}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          stompClient={stompClient}
          username={username}
          roomId={roomId}
          mySessionId={mySessionId}
          onBack={() => {
            setScreen('lobby');
          }}
        />
      )}
    </div>
  );
}

export default App;