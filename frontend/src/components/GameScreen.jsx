import { useState, useEffect, useRef } from 'react'

export default function GameScreen({ stompClient, username, roomId, mySessionId, onBack }) {
  // Core game state
  const [gameState, setGameState] = useState(null)
  const [timer, setTimer] = useState(60)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [showGameOver, setShowGameOver] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  
  // Drawing state
  const canvasRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState('pen') // 'pen', 'eraser'
  const [currentColor, setCurrentColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(16)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })

  // Check if I'm the drawer
  const isMyTurn = gameState?.currentDrawerSessionId === mySessionId
  
  // Fetch initial game state on mount (fallback if WebSocket is slow)
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/room/${roomId}/state`)
        if (response.ok) {
          const state = await response.json()
          setGameState(state)
          if ((state.isGameRunning || state.gameRunning) && state.roundTime) {
            setTimer(state.roundTime)
          }
        }
      } catch (error) {
        console.error('Failed to fetch initial state:', error)
      }
    }
    
    // Fetch after a short delay to allow WebSocket to connect
    const timer = setTimeout(fetchInitialState, 500)
    return () => clearTimeout(timer)
  }, [roomId])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only work if not typing in chat
      if (document.activeElement.id === 'chat-input') return
      
      if (e.key === 'q' || e.key === 'Q') setCurrentTool('pen')
      else if (e.key === 'e' || e.key === 'E') setCurrentTool('eraser')
      else if (e.key === '1') setBrushSize(8)
      else if (e.key === '2') setBrushSize(16)
      else if (e.key === '3') setBrushSize(24)
      else if (e.key === '4') setBrushSize(32)
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Global mouseup listener to stop drawing even when mouse released outside canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDrawing(false)
    }
    
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  // Color palette
  const colorPalette = [
    '#000000', '#FFFFFF', '#C0C0C0', '#808080',
    '#FF0000', '#800000', '#FFFF00', '#808000',
    '#00FF00', '#008000', '#00FFFF', '#008080',
    '#0000FF', '#000080', '#FF00FF', '#800080',
    '#FFA500', '#A52A2A', '#FF69B4', '#FFD700'
  ]

  // Brush sizes (matching keyboard shortcuts 1-4)
  const brushSizes = [8, 16, 24, 32]

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const initCanvas = () => {
      const container = canvas.parentElement
      const { width, height } = container.getBoundingClientRect()
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
    }

    initCanvas()
    window.addEventListener('resize', initCanvas)
    return () => window.removeEventListener('resize', initCanvas)
  }, [])

  // WebSocket subscriptions
  useEffect(() => {
    if (!stompClient) return

    const subs = []

    // Subscribe to draw events
    subs.push(stompClient.subscribe(`/topic/room/${roomId}/draw`, (msg) => {
      const data = JSON.parse(msg.body)
      renderDrawing(data)
    }))

    // Subscribe to chat
    subs.push(stompClient.subscribe(`/topic/room/${roomId}/chat`, (msg) => {
      const chatMsg = JSON.parse(msg.body)
      setMessages(prev => [...prev, chatMsg])
    }))

    // Subscribe to game state
    subs.push(stompClient.subscribe(`/topic/room/${roomId}/state`, (msg) => {
      const state = JSON.parse(msg.body)
      setGameState(state)
      setShowGameOver(state.gameOver || false)
      
      // Sync timer if game is running
      if ((state.isGameRunning || state.gameRunning) && state.roundTime !== undefined) {
        setTimer(state.roundTime)
      }
    }))

    // Subscribe to timer
    subs.push(stompClient.subscribe(`/topic/room/${roomId}/time`, (msg) => {
      setTimer(parseInt(msg.body))
    }))

    // Subscribe to personal draw queue
    subs.push(stompClient.subscribe('/user/queue/draw', (msg) => {
      const data = JSON.parse(msg.body)
      renderDrawing(data)
    }))

    return () => subs.forEach(s => s.unsubscribe())
  }, [stompClient, roomId])

  // Render drawing on canvas
  const renderDrawing = (data) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    if (data.type === 'CLEAR') {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }

    const x1 = (data.prevX / 1000) * canvas.width
    const y1 = (data.prevY / 1000) * canvas.height
    const x2 = (data.currX / 1000) * canvas.width
    const y2 = (data.currY / 1000) * canvas.height

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  // Mouse down - start drawing
  const handleMouseDown = (e) => {
    if (!isMyTurn) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    let x = e.clientX - rect.left
    let y = e.clientY - rect.top
    
    // Clamp coordinates within displayed canvas bounds
    x = Math.max(0, Math.min(x, rect.width))
    y = Math.max(0, Math.min(y, rect.height))
    
    // Scale to internal canvas coordinates
    const canvasX = (x / rect.width) * canvas.width
    const canvasY = (y / rect.height) * canvas.height

    setIsDrawing(true)
    setLastPos({ x: canvasX, y: canvasY })
  }

  // Mouse move - draw
  const handleMouseMove = (e) => {
    if (!isMyTurn) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    let x = e.clientX - rect.left
    let y = e.clientY - rect.top
    
    // Clamp coordinates within displayed canvas bounds
    x = Math.max(0, Math.min(x, rect.width))
    y = Math.max(0, Math.min(y, rect.height))
    
    // Scale to internal canvas coordinates
    const canvasX = (x / rect.width) * canvas.width
    const canvasY = (y / rect.height) * canvas.height
    
    // If not drawing yet but mouse is down (re-entering canvas), start from this point
    if (!isDrawing && e.buttons === 1) {
      setIsDrawing(true)
      setLastPos({ x: canvasX, y: canvasY })
      return
    }
    
    if (!isDrawing) return

    // Draw locally using scaled canvas coordinates
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(lastPos.x, lastPos.y)
    ctx.lineTo(canvasX, canvasY)
    ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : currentColor
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Normalize and send to server (clamp to 0-1000 range)
    const prevX = Math.max(0, Math.min(1000, Math.round((lastPos.x / canvas.width) * 1000)))
    const prevY = Math.max(0, Math.min(1000, Math.round((lastPos.y / canvas.height) * 1000)))
    const currX = Math.max(0, Math.min(1000, Math.round((canvasX / canvas.width) * 1000)))
    const currY = Math.max(0, Math.min(1000, Math.round((canvasY / canvas.height) * 1000)))

    stompClient.send(`/app/draw/${roomId}`, {}, JSON.stringify({
      type: 'DRAW',
      prevX,
      prevY,
      currX,
      currY,
      color: currentTool === 'eraser' ? '#FFFFFF' : currentColor,
      lineWidth: brushSize
    }))

    setLastPos({ x: canvasX, y: canvasY })
  }

  // Mouse up - stop drawing
  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  // Send chat message
  const handleSendMessage = () => {
    if (!chatInput.trim() || isMyTurn) return

    stompClient.send(`/app/chat/${roomId}`, {}, JSON.stringify({
      type: 'CHAT',
      sender: username,
      content: chatInput
    }))

    setChatInput('')
  }

  // Copy room code to clipboard
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // Start game
  const handleStartGame = () => {
    console.log('🎮 Starting game in room:', roomId)
    if (!stompClient || !stompClient.connected) {
      console.error('❌ WebSocket not connected!')
      alert('Connection lost. Please refresh and try again.')
      return
    }
    try {
      stompClient.send(`/app/start/${roomId}`, {}, '{}')
      console.log('✅ Start game message sent to /app/start/' + roomId)
    } catch (error) {
      console.error('❌ Error sending start game:', error)
      alert('Failed to start game. Please try again.')
    }
  }

  // Clear canvas
  const handleClearCanvas = () => {
    if (!isMyTurn) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    stompClient.send(`/app/draw/${roomId}`, {}, JSON.stringify({ type: 'CLEAR' }))
  }

  // Get round info
  const getRoundInfo = () => {
    if (!gameState?.currentRound) return 'Waiting...'
    const maxRounds = gameState.totalRounds || gameState.maxRounds || '?'
    return `Round ${gameState.currentRound}/${maxRounds}`
  }

  return (
    <div className="game-screen">
      {/* Header Bar */}
      <header className="game-header">
        <div className="header-left">
          <button className="btn btn-blue" style={{padding: '8px 16px', fontSize: '14px'}} onClick={onBack}>
            ← Back
          </button>
          <span className="round-info" style={{marginLeft: '15px'}}>{getRoundInfo()}</span>
          {isMyTurn && gameState?.isGameRunning && (
            <span style={{marginLeft: '15px', padding: '6px 12px', background: '#48CFAD', color: 'white', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold'}}>
              ✏️ YOUR TURN!
            </span>
          )}
        </div>
        
        <div className="header-center">
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'}}>
            <div className="word-container">
              {isMyTurn ? (
                <span className="word-reveal">{gameState?.currentWord || 'LOADING...'}</span>
              ) : (
                <span className="word-hidden">{gameState?.hintWord || '_ _ _ _ _'}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '2px solid #fbbf24',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{fontSize: '11px', color: '#6b7280', fontWeight: '600'}}>ROOM</span>
              <span style={{
                fontSize: '16px',
                fontWeight: '800',
                color: '#f59e0b',
                letterSpacing: '1px',
                fontFamily: 'monospace'
              }}>{roomId}</span>
              <button
                onClick={copyRoomCode}
                style={{
                  padding: '4px 8px',
                  background: copiedCode ? '#10b981' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {copiedCode ? '✓' : '📋'}
              </button>
            </div>
            <div className="timer-container">
              <svg className="timer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="timer-value">{timer}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Layout */}
      <main className="game-main">
        {/* Left Panel - Players */}
        <aside className="panel-left">
          <div className="panel-header">Players ({gameState?.players?.length || 0})</div>
          <div className="players-list">
            {gameState?.players && gameState.players.length > 0 ? (
              gameState.players.sort((a, b) => b.score - a.score).map((player, idx) => (
                <div 
                  key={player.sessionId} 
                  className={`player-item ${player.sessionId === mySessionId ? 'is-me' : ''} ${player.sessionId === gameState.currentDrawerSessionId ? 'is-drawing' : ''}`}
                >
                  <span className="player-rank">#{idx + 1}</span>
                  <div className="player-info">
                    <div className="player-name">{player.username}</div>
                    <div className="player-score">{player.score} pts</div>
                  </div>
                  {player.sessionId === gameState.currentDrawerSessionId && (
                    <span className="drawing-indicator">✏️</span>
                  )}
                </div>
              ))
            ) : (
              <div style={{padding: '20px', textAlign: 'center', color: '#888'}}>
                Loading players...
              </div>
            )}
          </div>
        </aside>

        {/* Center Panel - Canvas */}
        <section className="panel-center">
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              className="draw-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
            {(!gameState?.isGameRunning && !gameState?.gameRunning && !gameState?.currentDrawerSessionId) && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                pointerEvents: 'none',
                zIndex: 5
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '24px',
                  maxWidth: '500px',
                  padding: '40px',
                  pointerEvents: 'auto'
                }}>
                  <h2 style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#2d3748',
                    margin: 0,
                    textAlign: 'center',
                    letterSpacing: '0.5px'
                  }}>
                    WAITING TO START...
                  </h2>
                  
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '24px 32px',
                    borderRadius: '16px',
                    border: '3px dashed #fbbf24',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    textAlign: 'center'
                  }}>
                    <div style={{fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '12px'}}>
                      Share this code with friends:
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center'}}>
                      <span style={{
                        fontSize: '42px',
                        fontWeight: '800',
                        color: '#f59e0b',
                        letterSpacing: '4px',
                        fontFamily: 'monospace'
                      }}>
                        {roomId}
                      </span>
                      <button
                        onClick={copyRoomCode}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: copiedCode ? '#10b981' : '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      >
                        {copiedCode ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '16px',
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                    {gameState?.players?.length || 0} player(s) in room
                  </div>

                  <button
                    onClick={handleStartGame}
                    style={{
                      padding: '16px 60px',
                      fontSize: '20px',
                      fontWeight: '700',
                      color: 'white',
                      backgroundColor: '#10b981',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      boxShadow: '0 8px 16px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.2s',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#059669'
                      e.target.style.transform = 'translateY(-2px)'
                      e.target.style.boxShadow = '0 12px 20px rgba(16, 185, 129, 0.5)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#10b981'
                      e.target.style.transform = 'translateY(0)'
                      e.target.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    🎮 START GAME
                  </button>

                  <div style={{
                    fontSize: '13px',
                    color: '#9ca3af',
                    backgroundColor: '#f3f4f6',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    lineHeight: '1.6'
                  }}>
                    💡 <strong>Tip:</strong> When drawing, press Q (pen), E (eraser), 1-4 (brush sizes)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawing Tools */}
          {isMyTurn && (
            <div className="toolbar">
              <div className="toolbar-section">
                <label className="toolbar-label">Tools (Q/E)</label>
                <div style={{display: 'flex', gap: '8px', marginBottom: '10px'}}>
                  <button
                    className={`tool-button ${currentTool === 'pen' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('pen')}
                    title="Pen (Q)"
                    style={{padding: '8px 16px', background: currentTool === 'pen' ? '#4FC1E9' : '#ddd'}}
                  >
                    ✏️ Pen
                  </button>
                  <button
                    className={`tool-button ${currentTool === 'eraser' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('eraser')}
                    title="Eraser (E)"
                    style={{padding: '8px 16px', background: currentTool === 'eraser' ? '#ED5565' : '#ddd'}}
                  >
                    🧹 Eraser
                  </button>
                </div>
              </div>

              <div className="toolbar-section">
                <label className="toolbar-label">Colors</label>
                <div className="color-palette">
                  {colorPalette.map(color => (
                    <button
                      key={color}
                      className={`color-option ${currentColor === color && currentTool === 'pen' ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => { setCurrentColor(color); setCurrentTool('pen'); }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-section">
                <label className="toolbar-label">Brush Size (1-4)</label>
                <div className="brush-sizes">
                  {brushSizes.map(size => (
                    <button
                      key={size}
                      className={`brush-option ${brushSize === size ? 'active' : ''}`}
                      onClick={() => setBrushSize(size)}
                      title={`Size ${size}`}
                    >
                      <span className="brush-dot" style={{ width: size, height: size }} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-section">
                <button className="tool-button" onClick={() => setCurrentColor('#FFFFFF')} title="Eraser">
                  Eraser
                </button>
                <button className="tool-button danger" onClick={handleClearCanvas} title="Clear All">
                  Clear
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Right Panel - Chat */}
        <aside className="panel-right">
          <div className="panel-header">Chat</div>
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`chat-message ${msg.type === 'SYSTEM' ? 'system' : msg.type === 'GUESS_CORRECT' ? 'correct' : ''}`}
              >
                {msg.type !== 'SYSTEM' && <strong>{msg.sender}: </strong>}
                <span>{msg.content}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-container">
            <input
              id="chat-input"
              type="text"
              className="chat-input"
              placeholder={isMyTurn ? "You can't guess!" : "Type your guess..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isMyTurn}
            />
          </div>
        </aside>
      </main>

      {/* Game Over Modal */}
      {showGameOver && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h1 className="modal-title">🎉 Game Over!</h1>
            <div className="final-results">
              <h2>Final Scores</h2>
              {gameState?.players?.sort((a, b) => b.score - a.score).map((player, idx) => (
                <div key={player.sessionId} className={`result-item ${idx === 0 ? 'winner' : ''}`}>
                  <span className="result-rank">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </span>
                  <span className="result-name">{player.username}</span>
                  <span className="result-score">{player.score} pts</span>
                </div>
              ))}
            </div>
            <button className="modal-button" onClick={onBack}>
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
