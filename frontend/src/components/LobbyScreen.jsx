import { useState, useEffect } from 'react'

export default function LobbyScreen({ stompClient, username, mySessionId, onBack, onJoinRoom }) {
  const [lobbies, setLobbies] = useState([])
  const [lobbyCode, setLobbyCode] = useState('')
  
  // Lobby configuration
  const [language, setLanguage] = useState('English')
  const [scoring, setScoring] = useState('Chill')
  const [drawTime, setDrawTime] = useState(120)
  const [rounds, setRounds] = useState(4)
  const [maxPlayers, setMaxPlayers] = useState(24)
  const [ipLimit, setIpLimit] = useState(2)
  const [customWords, setCustomWords] = useState(3)

  useEffect(() => {
    refreshLobbies()
  }, [])

  const refreshLobbies = () => {
    fetch('http://localhost:8080/api/lobby/list')
      .then(res => res.json())
      .then(data => {
        setLobbies(data)
      })
      .catch(err => {
        console.error('Failed to load lobbies:', err)
      })
  }

  const createRoom = (isPrivate) => {
    const roomCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Send complete configuration including isPrivate flag
    stompClient.send('/app/join', {}, JSON.stringify({
      username,
      roomId: roomCode,
      action: 'create',
      config: {
        language: language,
        scoringMode: scoring,
        drawingTime: drawTime,
        rounds: rounds,
        maxPlayers: maxPlayers,
        playersPerIpLimit: ipLimit,
        customWordsPerTurn: customWords,
        customWords: [],
        isPrivate: isPrivate,
        lobbyName: isPrivate ? 'Private Game' : 'Public Game'
      }
    }))

    onJoinRoom(roomCode)
  }

  const joinLobbyByCode = () => {
    if (!lobbyCode.trim()) {
      alert('Please enter a room code!')
      return
    }
    joinRoom(lobbyCode)
  }

  const joinRoom = (roomCode) => {
    // Don't subscribe here - GameScreen will handle subscriptions
    stompClient.send('/app/join', {}, JSON.stringify({
      username,
      roomId: roomCode,
      action: 'join'
    }))

    onJoinRoom(roomCode)
  }

  const adjustValue = (setter, value, delta, min, max) => {
    const newValue = value + delta
    if (newValue >= min && newValue <= max) {
      setter(newValue)
    }
  }

  return (
    <div className="lobby-screen">
      <button className="btn btn-blue" style={{ width: 'auto', padding: '10px 25px' }} onClick={onBack}>
        ← Back
      </button>

      <div className="lobby-content">
        <div className="create-lobby">
          <h3>Create Lobby</h3>
          
          <div className="setting-row">
            <label>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option>English</option>
              <option>German</option>
              <option>French</option>
              <option>Italian</option>
            </select>
          </div>

          <div className="setting-row">
            <label>Scoring</label>
            <select value={scoring} onChange={(e) => setScoring(e.target.value)}>
              <option>Chill</option>
              <option>Normal</option>
              <option>Competitive</option>
            </select>
          </div>

          <div className="setting-row">
            <label>Drawing Time</label>
            <div className="setting-controls">
              <button className="btn btn-small btn-blue" onClick={() => adjustValue(setDrawTime, drawTime, -10, 30, 300)}>-</button>
              <input type="number" value={drawTime} onChange={(e) => setDrawTime(parseInt(e.target.value))} min="30" max="300" style={{ width: '70px', textAlign: 'center' }} />
              <button className="btn btn-small btn-blue" onClick={() => adjustValue(setDrawTime, drawTime, 10, 30, 300)}>+</button>
            </div>
          </div>

          <div className="setting-row">
            <label>Rounds</label>
            <div className="setting-controls">
              <button className="btn btn-small btn-blue" onClick={() => adjustValue(setRounds, rounds, -1, 1, 10)}>-</button>
              <input type="number" value={rounds} onChange={(e) => setRounds(parseInt(e.target.value))} min="1" max="10" style={{ width: '70px', textAlign: 'center' }} />
              <button className="btn btn-small btn-blue" onClick={() => adjustValue(setRounds, rounds, 1, 1, 10)}>+</button>
            </div>
          </div>

          <div className="setting-row">
            <label>Maximum Players</label>
            <div className="setting-controls">
              <button className="btn btn-small btn-blue" onClick={() => adjustValue(setMaxPlayers, maxPlayers, -2, 2, 50)}>-</button>
              <input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value))} min="2" max="50" style={{ width: '70px', textAlign: 'center' }} />
              <button className="btn btn-small btn-blue" onClick={() => adjustValue(setMaxPlayers, maxPlayers, 2, 2, 50)}>+</button>
            </div>
          </div>

          <div className="setting-row">
            <label>Players per IP</label>
            <div className="setting-controls">
              <button className="btn btn-small btn-blue" onClick={() => adjustValue(setIpLimit, ipLimit, -1, 1, 10)}>-</button>
              <input type="number" value={ipLimit} onChange={(e) => setIpLimit(parseInt(e.target.value))} min="1" max="10" style={{ width: '70px', textAlign: 'center' }} />
              <button className="btn btn-small btn-blue" onClick={() => adjustValue(setIpLimit, ipLimit, 1, 1, 10)}>+</button>
            </div>
          </div>

          <div className="setting-row">
            <label>Custom Words</label>
            <div className="setting-controls">
              <button className="btn btn-small btn-blue" onClick={() => adjustValue(setCustomWords, customWords, -1, 0, 5)}>-</button>
              <input type="number" value={customWords} onChange={(e) => setCustomWords(parseInt(e.target.value))} min="0" max="5" style={{ width: '70px', textAlign: 'center' }} />
              <button className="btn btn-small btn-blue" onClick={() => adjustValue(setCustomWords, customWords, 1, 0, 5)}>+</button>
            </div>
          </div>

          <div style={{ marginTop: '25px' }}>
            <button className="btn btn-green" onClick={() => createRoom(false)}>
              Create Public Lobby
            </button>
            <button className="btn btn-blue" onClick={() => createRoom(true)}>
              Create Private Lobby
            </button>
          </div>
        </div>

        <div className="join-lobby">
          <h3>Join Lobby</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Enter Room Code"
              value={lobbyCode}
              onChange={(e) => setLobbyCode(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '2px solid #ddd' }}
            />
            <button className="btn btn-blue" onClick={joinLobbyByCode}>
              Join Private Lobby
            </button>
          </div>

          <div style={{ borderTop: '2px solid #ddd', paddingTop: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Public Lobbies</h4>
            <button className="btn btn-blue" onClick={refreshLobbies} style={{ marginBottom: '15px' }}>
              🔄 Refresh
            </button>
            
            <div className="lobby-list">
              {lobbies.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                  No public lobbies available
                </p>
              ) : (
                lobbies.map(lobby => (
                  <div key={lobby.roomId} className="lobby-item" onClick={() => joinRoom(lobby.roomId)}>
                    <div className="lobby-info">
                      <h4>{lobby.lobbyName || 'Game Room'}</h4>
                      <p>
                        {lobby.players.length}/{lobby.maxPlayers} players • {lobby.drawingTime}s • {lobby.maxRounds} rounds
                      </p>
                    </div>
                    <button className="btn btn-blue btn-small">Join →</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
