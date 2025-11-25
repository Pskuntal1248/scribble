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
    <div className="game-screen-classic">
      {/* Header */}
      <div className="classic-header">
        <div className="header-section">
          <div className="round-info">{getTurnInfo()}</div>
        </div>
        
        <div className="word-display">
          {amIDrawer ? (gameState?.currentWord || 'WAITING...') : (gameState?.hintWord || '_ _ _ _ _')}
        </div>
        
        <div className="timer-display">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>{timer}</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="classic-main">
        {/* Left Sidebar - Leaderboard */}
        <div className="classic-sidebar-left">
          {gameState?.players?.sort((a, b) => b.score - a.score).map((player, index) => (
            <div key={player.sessionId} className={`player-card ${player.sessionId === mySessionId ? 'me' : ''}`}>
              <div className="player-rank">#{index + 1}</div>
              <div className="player-details">
                <div className="player-name" style={{ color: player.sessionId === mySessionId ? '#1E88E5' : 'inherit' }}>
                  {player.username}
                </div>
                <div className="player-score">Points: {player.score}</div>
              </div>
              {player.sessionId === gameState?.currentDrawerSessionId && (
                <div className="drawer-icon">✏️</div>
              )}
            </div>
          ))}
        </div>

        {/* Center - Canvas */}
        <div className="classic-center">
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              className="game-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
            {!amIDrawer && (
              <div className="overlay-text">
                {gameState?.currentDrawerSessionId ? 'GUESS THE WORD!' : 'WAITING FOR PLAYERS...'}
              </div>
            )}
          </div>

          {/* Toolbar - Only visible to drawer */}
          {amIDrawer && (
            <div className="classic-toolbar">
              <div className="colors-section">
                {colors.map(color => (
                  <div
                    key={color}
                    className={`color-swatch ${currentColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCurrentColor(color)}
                    title={color}
                  />
                ))}
              </div>
              
              <div className="tools-section">
                <button 
                  className={`tool-btn ${currentColor === '#FFFFFF' ? 'active' : ''}`} 
                  onClick={() => setCurrentColor('#FFFFFF')}
                  title="Eraser"
                >
                  🧹
                </button>
                <button className="tool-btn" onClick={clearCanvas} title="Clear Canvas">
                  🗑️
                </button>
                
                <div style={{ width: '1px', height: '24px', background: '#ddd', margin: '0 5px' }}></div>
                
                {[2, 5, 10, 15].map(size => (
                  <button
                    key={size}
                    className={`size-btn ${lineWidth === size ? 'active' : ''}`}
                    onClick={() => setLineWidth(size)}
                    title={`Size ${size}`}
                  >
                    <div className="size-circle" style={{ width: size, height: size }}></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Chat */}
        <div className="classic-sidebar-right">
          <div className="chat-header">Chat Room</div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-message ${msg.type === 'SYSTEM' ? 'system' : msg.type === 'GUESS_CORRECT' ? 'correct' : ''}`}
              >
                {msg.type !== 'SYSTEM' && <b>{msg.sender}:</b>}
                <span>{msg.content}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              placeholder={amIDrawer ? "Type here to chat..." : "Type your guess here..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={amIDrawer && false} /* Allow drawer to chat but maybe not guess? Logic says drawer can chat */
            />
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {showGameOver && (
        <div className="game-over-modal">
          <div className="game-over-content">
            <h1>GAME OVER</h1>
            <div className="final-scores">
              {gameState?.players?.sort((a, b) => b.score - a.score).map((player, index) => (
                <div key={player.sessionId} className={`final-score-item ${index === 0 ? 'winner' : ''}`}>
                  <span>#{index + 1} {player.username}</span>
                  <span>{player.score} pts</span>
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={onBack}>
              BACK TO HOME
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
