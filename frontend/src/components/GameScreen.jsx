import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Clock, 
  Eraser, 
  Pen, 
  Trash2,
  Play,
  Trophy,
  Users,
  MessageSquare
} from 'lucide-react'
import { cn } from '../lib/utils'

// Get backend URL from environment variables
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'

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
        const response = await fetch(`${BACKEND_URL}/api/room/${roomId}/state`)
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
    <div className="flex h-screen w-full flex-col bg-gray-50">
      {/* Enhanced Header */}
      <motion.header 
        className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4">
          <motion.button 
            onClick={onBack}
            whileHover={{ scale: 1.05, x: -3 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <ArrowLeft size={16} />
            Back
          </motion.button>
          <span className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Trophy size={20} className="text-amber-500" />
            {getRoundInfo()}
          </span>
          <AnimatePresence>
            {isMyTurn && gameState?.isGameRunning && (
              <motion.span 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
              >
                <Pen size={12} />
                YOUR TURN!
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex flex-1 justify-center">
          <div className="rounded-xl bg-gray-100 px-8 py-2 text-center">
            {isMyTurn ? (
              <span className="text-2xl font-bold tracking-[0.2em] text-indigo-600">{gameState?.currentWord || 'LOADING...'}</span>
            ) : (
              <span className="text-2xl font-bold tracking-[0.5em] text-gray-800">{gameState?.hintWord || '_ _ _ _ _'}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-1.5"
          >
            <span className="text-xs font-bold text-amber-700">ROOM</span>
            <span className="font-mono text-lg font-bold text-amber-600">{roomId}</span>
            <motion.button
              onClick={copyRoomCode}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold text-white transition-colors",
                copiedCode ? "bg-emerald-500" : "bg-blue-500 hover:bg-blue-600"
              )}
            >
              {copiedCode ? <Check size={12} /> : <Copy size={12} />}
              {copiedCode ? 'Copied' : 'Copy'}
            </motion.button>
          </motion.div>
          <motion.div 
            animate={{ 
              scale: timer <= 10 ? [1, 1.1, 1] : 1,
            }}
            transition={{ 
              duration: 0.5,
              repeat: timer <= 10 ? Infinity : 0
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-bold text-white shadow-md transition-colors",
              timer <= 10 ? "bg-red-500" : "bg-blue-500"
            )}
          >
            <Clock size={20} />
            <span className="text-xl">{timer}</span>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Game Layout */}
      <main className="flex flex-1 gap-6 overflow-hidden p-6">
        {/* Enhanced Left Panel - Players */}
        <motion.aside 
          className="flex w-72 flex-col rounded-2xl bg-white shadow-sm ring-1 ring-gray-200"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="flex items-center justify-center gap-2 border-b border-gray-100 p-4 font-bold text-gray-700">
            <Users size={18} />
            Players ({gameState?.players?.length || 0})
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <AnimatePresence>
              {gameState?.players && gameState.players.length > 0 ? (
                gameState.players.sort((a, b) => b.score - a.score).map((player, idx) => (
                  <motion.div 
                    key={player.sessionId} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className={cn(
                      "mb-2 flex items-center gap-3 rounded-xl p-3 transition-all",
                      player.sessionId === mySessionId ? "bg-blue-50 ring-1 ring-blue-200" : "bg-gray-50",
                      player.sessionId === gameState.currentDrawerSessionId && "ring-2 ring-amber-400"
                    )}
                  >
                    <span className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                      idx === 0 ? "bg-yellow-100 text-yellow-700" : 
                      idx === 1 ? "bg-gray-200 text-gray-700" : 
                      idx === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate font-bold text-gray-900">{player.username}</div>
                      <div className="text-xs font-medium text-gray-500">{player.score} pts</div>
                    </div>
                    {player.sessionId === gameState.currentDrawerSessionId && (
                      <motion.span 
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-xl"
                      >
                        ✏️
                      </motion.span>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-gray-400">Loading players...</div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>

        {/* Center Panel - Canvas */}
        <section className="flex flex-1 flex-col gap-4">
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <canvas
              ref={canvasRef}
              className="h-full w-full cursor-crosshair touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
            {(!gameState?.isGameRunning && !gameState?.gameRunning && !gameState?.currentDrawerSessionId) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 backdrop-blur-sm">
                <div className="flex max-w-md flex-col items-center gap-8 p-8 text-center">
                  <h2 className="text-3xl font-extrabold text-gray-900">WAITING TO START...</h2>
                  
                  <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-8">
                    <div className="mb-4 text-sm font-bold text-amber-800">Share this code with friends:</div>
                    <div className="flex items-center justify-center gap-4">
                      <span className="font-mono text-5xl font-black tracking-widest text-amber-600">{roomId}</span>
                      <button
                        onClick={copyRoomCode}
                        className={cn(
                          "rounded-lg px-4 py-2 text-sm font-bold text-white transition-all",
                          copiedCode ? "bg-emerald-500" : "bg-blue-500 hover:bg-blue-600"
                        )}
                      >
                        {copiedCode ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="font-medium text-gray-500">
                    {gameState?.players?.length || 0} player(s) in room
                  </div>

                  <motion.button
                    onClick={handleStartGame}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-12 py-4 text-xl font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:from-emerald-400 hover:to-emerald-500"
                  >
                    <Play size={24} fill="currentColor" />
                    START GAME
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Drawing Tools */}
          <AnimatePresence>
            {isMyTurn && (
              <motion.div 
                className="flex items-center gap-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase text-gray-400">Tools</label>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => setCurrentTool('pen')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-4 py-2 font-bold transition-all",
                        currentTool === 'pen' ? "bg-blue-500 text-white shadow-md shadow-blue-500/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      <Pen size={16} /> Pen
                    </motion.button>
                    <motion.button
                      onClick={() => setCurrentTool('eraser')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-4 py-2 font-bold transition-all",
                        currentTool === 'eraser' ? "bg-red-500 text-white shadow-md shadow-red-500/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      <Eraser size={16} /> Eraser
                    </motion.button>
                  </div>
                </div>

                <div className="h-10 w-px bg-gray-200" />

                <div className="flex flex-col gap-2 shrink-0">
                  <label className="text-xs font-bold uppercase text-gray-400">Colors</label>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {colorPalette.map((color, index) => (
                      <motion.button
                        key={color}
                        onClick={() => { setCurrentColor(color); setCurrentTool('pen'); }}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-all",
                          currentColor === color && currentTool === 'pen' ? "border-gray-900 scale-110" : "border-transparent hover:border-gray-300"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-10 w-px bg-gray-200" />

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase text-gray-400">Size</label>
                  <div className="flex items-center gap-2">
                    {brushSizes.map((size) => (
                      <motion.button
                        key={size}
                        onClick={() => setBrushSize(size)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                          brushSize === size ? "bg-blue-100 ring-2 ring-blue-500" : "bg-gray-100 hover:bg-gray-200"
                        )}
                      >
                        <div 
                          className="rounded-full bg-gray-900"
                          style={{ width: size / 2, height: size / 2 }}
                        />
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="ml-auto">
                  <motion.button 
                    onClick={handleClearCanvas} 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 font-bold text-red-600 hover:bg-red-200"
                  >
                    <Trash2 size={16} />
                    Clear
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Enhanced Right Panel - Chat */}
        <motion.aside 
          className="flex w-80 flex-col rounded-2xl bg-white shadow-sm ring-1 ring-gray-200"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="flex items-center justify-center gap-2 border-b border-gray-100 p-4 font-bold text-gray-700">
            <MessageSquare size={18} />
            Chat
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, x: 20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm shadow-sm",
                      msg.type === 'SYSTEM' ? "bg-blue-50 text-blue-800 border border-blue-100" : 
                      msg.type === 'GUESS_CORRECT' ? "bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold" : 
                      "bg-white text-gray-800 border border-gray-100"
                    )}
                  >
                    {msg.type !== 'SYSTEM' && <span className="font-bold text-indigo-600">{msg.sender}: </span>}
                    <span>{msg.content}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="border-t border-gray-100 p-4">
            <input
              id="chat-input"
              type="text"
              placeholder={isMyTurn ? "You can't guess!" : "Type your guess..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isMyTurn}
              className={cn(
                "w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium outline-none transition-all",
                isMyTurn ? "cursor-not-allowed opacity-50" : "focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              )}
            />
          </div>
        </motion.aside>
      </main>

      {/* Enhanced Game Over Modal */}
      <AnimatePresence>
        {showGameOver && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.h1 
                className="mb-8 text-center text-4xl font-black text-gray-900"
                animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                🎉 Game Over!
              </motion.h1>
              <div className="mb-8">
                <h2 className="mb-4 flex items-center justify-center gap-2 text-lg font-bold uppercase tracking-wider text-gray-500">
                  <Trophy size={20} />
                  Final Scores
                </h2>
                <div className="space-y-3">
                  {gameState?.players?.sort((a, b) => b.score - a.score).map((player, idx) => (
                    <motion.div 
                      key={player.sessionId} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1, duration: 0.4 }}
                      whileHover={{ scale: 1.02 }}
                      className={cn(
                        "flex items-center gap-4 rounded-xl p-4 transition-all",
                        idx === 0 ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 shadow-sm" : "bg-gray-50 border border-gray-100"
                      )}
                    >
                      <span className="text-2xl">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <span className="flex-1 font-bold text-gray-900">{player.username}</span>
                      <span className="font-bold text-indigo-600">{player.score} pts</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              <motion.button 
                onClick={onBack}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 font-bold text-white shadow-lg transition-all hover:bg-gray-800"
              >
                <ArrowLeft size={20} />
                Back to Menu
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
