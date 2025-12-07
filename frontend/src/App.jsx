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

function App() {
  const [screen, setScreen] = useState('login') // 'login', 'lobby', 'game'
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState('')
  const [stompClient, setStompClient] = useState(null)
  const [mySessionId, setMySessionId] = useState('')
  const [connected, setConnected] = useState(false)

  const connectWebSocket = (callback, retryCount = 0) => {
    const socket = new SockJS(`${WS_URL}/ws`, null, {
      timeout: 10000,
      transports: ['websocket', 'xhr-streaming', 'xhr-polling']
    })
    const client = Stomp.over(socket)
    client.debug = null
    client.reconnect_delay = 5000
    client.heartbeat.outgoing = 20000 // Match backend heartbeat
    client.heartbeat.incoming = 20000

    client.connect({}, (frame) => {
      const url = socket._transport.url
      const parts = url.split('/')
      const sessionId = parts[parts.length - 2]
      setMySessionId(sessionId)
      setConnected(true)
      setStompClient(client)
      
      // Ping server periodically to keep connection alive
      const pingInterval = setInterval(() => {
        if (client.connected) {
          try {
            fetch(`${BACKEND_URL}/api/ping`).catch(() => {})
          } catch (e) {}
        } else {
          clearInterval(pingInterval)
        }
      }, 25000) // Ping every 25 seconds
      
      if (callback) callback(client, sessionId)
    }, (error) => {
      console.error('WebSocket connection error:', error)
      
      if (retryCount < 5) { // Increased to 5 attempts
        const delay = Math.min(1000 * Math.pow(2, retryCount), 15000)
        console.log(`Retrying connection in ${delay}ms... (attempt ${retryCount + 1}/5)`)
        setTimeout(() => connectWebSocket(callback, retryCount + 1), delay)
      } else {
        alert('Connection lost. Please refresh and try again.')
      }
    })
    
    // Handle disconnect with reconnection attempt
    socket.onclose = () => {
      console.log('WebSocket closed')
      setConnected(false)
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (!client.connected) {
          console.log('Attempting to reconnect...')
          connectWebSocket(callback, 0)
        }
      }, 3000)
    }
  }

  return (
    <>
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
    </>
  );
}

export default App;