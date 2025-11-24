import { useState, useEffect, useRef } from 'react'

export default function GameScreen({ stompClient, username, roomId, mySessionId, onBack }) {
  // Game state
  const [gameState, setGameState] = useState(null)
  const [timer, setTimer] = useState(60)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [showGameOver, setShowGameOver] = useState(false)
  
  // Drawing state
  const canvasRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentColor, setCurrentColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(5)
  const [lastX, setLastX] = useState(0)
  const [lastY, setLastY] = useState(0)

  // Check if current user is the drawer
  const amIDrawer = gameState?.currentDrawerSessionId === mySessionId

  // Modern color palette
  const colors = [
    '#000000', '#FFFFFF', '#F44336', '#E91E63', '#9C27B0', '#673AB7',
    '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
    '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'
  ]

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Canvas resize based on container
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      const rect = container.getBoundingClientRect()
      
      canvas.width = rect.width
      canvas.height = rect.height
      
      // Redraw canvas background
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [amIDrawer])

  // WebSocket subscriptions
  useEffect(() => {
    if (!stompClient) return

    const subscriptions = []

    // Drawing messages
    const drawSub = stompClient.subscribe(`/topic/room/${roomId}/draw`, (message) => {
      const drawData = JSON.parse(message.body)
      handleDraw(drawData)
    })
    subscriptions.push(drawSub)

    // Chat messages
    const chatSub = stompClient.subscribe(`/topic/room/${roomId}/chat`, (message) => {
      const chatMsg = JSON.parse(message.body)
      setMessages(prev => [...prev, chatMsg])
    })
    subscriptions.push(chatSub)

    // Game state updates
    const stateSub = stompClient.subscribe(`/topic/room/${roomId}/state`, (message) => {
      const state = JSON.parse(message.body)
      setGameState(state)
      
      if (state.gameOver) {
        setShowGameOver(true)
      } else {
        setShowGameOver(false)
      }
    })
    subscriptions.push(stateSub)

    // Timer updates
    const timeSub = stompClient.subscribe(`/topic/room/${roomId}/time`, (message) => {
      setTimer(parseInt(message.body))
    })
    subscriptions.push(timeSub)

    // Personal drawing messages
    const userDrawSub = stompClient.subscribe('/user/queue/draw', (message) => {
      const drawData = JSON.parse(message.body)
      handleDraw(drawData)
    })
    subscriptions.push(userDrawSub)

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
    }
  }, [stompClient, roomId, mySessionId])

  // Handle incoming drawing messages
  const handleDraw = (drawData) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    if (drawData.type === 'CLEAR') {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      return
    }

    // Denormalize coordinates from 0-1000 to actual canvas size
    const x1 = (drawData.prevX / 1000) * canvasWidth
    const y1 = (drawData.prevY / 1000) * canvasHeight
    const x2 = (drawData.currX / 1000) * canvasWidth
    const y2 = (drawData.currY / 1000) * canvasHeight

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = drawData.color
    ctx.lineWidth = drawData.lineWidth
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  // Start drawing
  const startDrawing = (e) => {
    if (!amIDrawer) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    setLastX(x)
    setLastY(y)
  }

  // Draw on canvas
  const draw = (e) => {
    if (!isDrawing || !amIDrawer) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Draw locally
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(lastX, lastY)
    ctx.lineTo(x, y)
    ctx.strokeStyle = currentColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.stroke()

    // Normalize coordinates to 0-1000 range
    const normalizedPrevX = Math.round((lastX / canvas.width) * 1000)
    const normalizedPrevY = Math.round((lastY / canvas.height) * 1000)
    const normalizedCurrX = Math.round((x / canvas.width) * 1000)
    const normalizedCurrY = Math.round((y / canvas.height) * 1000)

    // Send to server
    stompClient.send(`/app/room/${roomId}/draw`, {}, JSON.stringify({
      type: 'DRAW',
      prevX: normalizedPrevX,
      prevY: normalizedPrevY,
      currX: normalizedCurrX,
      currY: normalizedCurrY,
      color: currentColor,
      lineWidth: lineWidth
    }))

    setLastX(x)
    setLastY(y)
  }

  // Stop drawing
  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // Send chat message
  const sendMessage = () => {
    if (!chatInput.trim() || amIDrawer) return

    stompClient.send(`/app/room/${roomId}/chat`, {}, JSON.stringify({
      type: 'CHAT',
      sender: username,
      content: chatInput
    }))

    setChatInput('')
  }

  // Start game
  const startGame = () => {
    stompClient.send(`/app/room/${roomId}/start`, {}, '{}')
  }

  // Clear canvas
  const clearCanvas = () => {
    if (!amIDrawer) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    stompClient.send(`/app/room/${roomId}/draw`, {}, JSON.stringify({
      type: 'CLEAR'
    }))
  }

  // Get turn information
  const getTurnInfo = () => {
    if (!gameState?.currentRound) return ''
    return `Round ${gameState.currentRound}/${gameState.totalRounds} • Turn ${gameState.currentTurn}/${gameState.players?.length || 0}`
  }

  return (
    <div className="game-screen-new">
      {/* Top Header */}
      <div className="game-header">
        <div className="header-left">
          <div className="timer-box">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="timer-value">{timer}s</span>
          </div>
          <div className="turn-info">{getTurnInfo()}</div>
        </div>
        
        <div className="header-center">
          <div className="word-box">
            <div className="word-label">{amIDrawer ? '🎨 Your Word' : '🤔 Guess'}</div>
            <div className="word-text">
              {amIDrawer ? (gameState?.currentWord || 'WAITING...') : (gameState?.hintWord || '_ _ _ _ _')}
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="room-badge">
            <span className="room-label">ROOM</span>
            <span className="room-id">{roomId}</span>
          </div>
          <button className="start-btn" onClick={startGame}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            START
          </button>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="game-main">
        {/* Left Sidebar - Leaderboard */}
        <div className="sidebar sidebar-left">
          <div className="sidebar-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            <span>LEADERBOARD</span>
          </div>
          <div className="leaderboard">
            {gameState?.players?.sort((a, b) => b.score - a.score).map((player, index) => (
              <div key={player.sessionId} className={`leader-item ${player.sessionId === mySessionId ? 'me' : ''} rank-${index + 1}`}>
                <div className="rank-badge">
                  {index === 0 ? '👑' : index + 1}
                </div>
                <div className="player-info">
                  <div className="player-name">{player.username}</div>
                  <div className="player-score">{player.score} pts</div>
                </div>
                {player.sessionId === gameState?.currentDrawerSessionId && (
                  <div className="drawing-badge">🎨</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="canvas-container">
          <div className={`canvas-box ${amIDrawer ? 'drawing-mode' : 'guessing-mode'}`}>
            <canvas
              ref={canvasRef}
              className="main-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
            {!amIDrawer && (
              <div className="spectator-overlay">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                <p>Watch & Guess!</p>
              </div>
            )}
          </div>
          
          {amIDrawer && (
            <div className="tools-bar">
              <div className="tool-group">
                <div className="tool-label">COLORS</div>
                <div className="colors-grid">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`color-btn ${currentColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCurrentColor(color)}
                      title={color === '#FFFFFF' ? 'Eraser' : color}
                    />
                  ))}
                </div>
              </div>
              
              <div className="tool-divider"></div>
              
              <div className="tool-group">
                <div className="tool-label">SIZE</div>
                <div className="size-grid">
                  {[2, 5, 10, 15].map(size => (
                    <button
                      key={size}
                      className={`size-btn-new ${lineWidth === size ? 'active' : ''}`}
                      onClick={() => setLineWidth(size)}
                    >
                      <div className="size-dot" style={{ 
                        width: `${size * 1.5}px`, 
                        height: `${size * 1.5}px` 
                      }}></div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="tool-divider"></div>
              
              <button className="clear-btn" onClick={clearCanvas}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
                CLEAR
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar - Chat */}
        <div className="sidebar sidebar-right">
          <div className="sidebar-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
            <span>CHAT</span>
          </div>
          <div className="chat-box">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-msg ${msg.type === 'SYSTEM' ? 'system' : msg.type === 'GUESS_CORRECT' ? 'correct' : 'normal'}`}
              >
                <span className="msg-sender">{msg.sender}:</span>
                <span className="msg-text">{msg.content}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-box">
            <input
              type="text"
              className="chat-field"
              placeholder={amIDrawer ? "🎨 You're drawing!" : "Type your guess..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={amIDrawer}
            />
            <button className="send-btn" onClick={sendMessage} disabled={amIDrawer}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {showGameOver && (
        <div className="game-over-screen">
          <div className="game-over-card">
            <div className="trophy-icon">🏆</div>
            <h1 className="game-over-title">Game Over!</h1>
            <div className="final-rankings">
              {gameState?.players?.sort((a, b) => b.score - a.score).map((player, index) => (
                <div key={player.sessionId} className={`final-rank rank-${index + 1}`}>
                  <div className="final-rank-badge">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div className="final-player-name">{player.username}</div>
                  <div className="final-player-score">{player.score}</div>
                </div>
              ))}
            </div>
            <button className="menu-btn" onClick={onBack}>
              Return to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
