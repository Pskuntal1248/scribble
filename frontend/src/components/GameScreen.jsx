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
  MessageSquare,
  Palette
} from 'lucide-react'
import { cn } from '../lib/utils'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'

export default function GameScreen({ stompClient, username, roomId, mySessionId, onBack }) {
  const [gameState, setGameState] = useState(null)
  const [timer, setTimer] = useState(60)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [showGameOver, setShowGameOver] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [showWordChoice, setShowWordChoice] = useState(false)
  
  const [activeTab, setActiveTab] = useState('canvas')
  const canvasRef = useRef(null)
  const drawHistory = useRef([])
  const messagesEndRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState('pen')
  const [currentColor, setCurrentColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(16)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })

  const isMyTurn = gameState?.currentDrawerSessionId === mySessionId

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
  
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/room/${roomId}/state`)
        if (response.ok) {
          const state = await response.json()
          setGameState(state)
          
          if (state.drawHistory && state.drawHistory.length > 0 && drawHistory.current.length === 0) {
            drawHistory.current = state.drawHistory
            state.drawHistory.forEach(data => renderDrawing(data))
          }

          if ((state.isGameRunning || state.gameRunning) && state.roundTime) {
            setTimer(state.roundTime)
          }
        }
      } catch (error) {

      }
    }
    
    const timer = setTimeout(fetchInitialState, 500)
    return () => clearTimeout(timer)
  }, [roomId])
  
  useEffect(() => {
    const handleKeyDown = (e) => {
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

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDrawing(false)
    }
    
    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('touchend', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('touchend', handleGlobalMouseUp)
    }
  }, [])

  const colorPalette = [
    '#FFFFFF', '#000000', // White, Black
    '#C0C0C0', '#808080', // Light Gray, Gray
    '#FF0000', '#800000', // Red, Maroon
    '#FFA500', '#FF8C00', // Orange, Dark Orange
    '#FFFF00', '#DAA520', // Yellow, GoldenRod
    '#00FF00', '#008000', // Lime, Green
    '#87CEEB', '#0000FF', // Sky Blue, Blue
    '#4169E1', '#000080', // Royal Blue, Navy
    '#EE82EE', '#4B0082', // Violet, Indigo
    '#FFC0CB', '#FF00FF', // Pink, Magenta
    '#F5F5DC', '#8B4513', // Beige, SaddleBrown
    '#00FFFF', '#008080', // Cyan, Teal
  ]

  const brushSizes = [4, 8, 16, 24, 32]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => {
      const container = canvas.parentElement
      const { width, height } = container.getBoundingClientRect()
      
      if (width === 0 || height === 0) return
      if (canvas.width === width && canvas.height === height) return

      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      
      drawHistory.current.forEach(data => renderDrawing(data))
    }

    const init = () => {
      const container = canvas.parentElement
      const { width, height } = container.getBoundingClientRect()
      
      if (width === 0 || height === 0) return
      
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
    }
    
    init()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleTouchStart = (e) => {
      if (e.target === canvas) {
        e.preventDefault()
        startDrawing(e)
      }
    }

    const handleTouchMove = (e) => {
      if (e.target === canvas) {
        e.preventDefault()
        draw(e)
      }
    }

    const handleTouchEnd = (e) => {
      if (e.target === canvas) {
        e.preventDefault()
        stopDrawing(e)
      }
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDrawing, currentTool, currentColor, brushSize, lastPos, isMyTurn])

  useEffect(() => {
    if (!stompClient) return

    const subs = []

    subs.push(stompClient.subscribe(`/topic/room/${roomId}/draw`, (msg) => {
      const data = JSON.parse(msg.body)
      if (data.type === 'CLEAR') {
        drawHistory.current = []
      } else {
        drawHistory.current.push(data)
      }
      renderDrawing(data)
    }))

    subs.push(stompClient.subscribe(`/topic/room/${roomId}/chat`, (msg) => {
      const chatMsg = JSON.parse(msg.body)
      setMessages(prev => [...prev, chatMsg])
    }))

    subs.push(stompClient.subscribe(`/topic/room/${roomId}/state`, (msg) => {
      const state = JSON.parse(msg.body)
      setGameState(state)
      setShowGameOver(state.gameOver || false)
      
      if (state.currentDrawerSessionId === mySessionId && 
          !state.wordChosen && 
          state.wordChoices && 
          state.wordChoices.length > 0) {
        setShowWordChoice(true)
      } else {
        setShowWordChoice(false)
      }
      
      if ((state.isGameRunning || state.gameRunning) && state.roundTime !== undefined) {
        setTimer(state.roundTime)
      }
    }))

    subs.push(stompClient.subscribe(`/topic/room/${roomId}/time`, (msg) => {
      setTimer(parseInt(msg.body))
    }))

    subs.push(stompClient.subscribe('/user/queue/draw', (msg) => {
      const data = JSON.parse(msg.body)
      if (data.type === 'CLEAR') {
        drawHistory.current = []
      } else {
        drawHistory.current.push(data)
      }
      renderDrawing(data)
    }))

    return () => subs.forEach(s => s.unsubscribe())
  }, [stompClient, roomId])

  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    let clientX, clientY
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    let x = clientX - rect.left
    let y = clientY - rect.top
    
    x = Math.max(0, Math.min(x, rect.width))
    y = Math.max(0, Math.min(y, rect.height))
    
    const canvasX = (x / rect.width) * canvas.width
    const canvasY = (y / rect.height) * canvas.height
    
    return { canvasX, canvasY }
  }

  const startDrawing = (e) => {
    if (!isMyTurn) return


    const { canvasX, canvasY } = getCoordinates(e)

    setIsDrawing(true)
    setLastPos({ x: canvasX, y: canvasY })
  }

  const draw = (e) => {
    if (!isMyTurn) return

    const { canvasX, canvasY } = getCoordinates(e)
    
    if (!isDrawing && (e.buttons === 1 || e.type === 'touchmove')) {
      setIsDrawing(true)
      setLastPos({ x: canvasX, y: canvasY })
      return
    }
    
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(lastPos.x, lastPos.y)
    ctx.lineTo(canvasX, canvasY)
    ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : currentColor
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

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

  const stopDrawing = (e) => {
    setIsDrawing(false)
  }

  const handleSendMessage = () => {
    if (!chatInput.trim() || isMyTurn) return

    stompClient.send(`/app/chat/${roomId}`, {}, JSON.stringify({
      type: 'CHAT',
      sender: username,
      content: chatInput
    }))

    setChatInput('')
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleStartGame = () => {
    if (!stompClient || !stompClient.connected) {
      alert('Connection lost. Please refresh and try again.')
      return
    }
    try {
      stompClient.send(`/app/start/${roomId}`, {}, '{}')
    } catch (error) {
      alert('Failed to start game. Please try again.')
    }
  }

  const handleClearCanvas = () => {
    if (!isMyTurn) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    stompClient.send(`/app/draw/${roomId}`, {}, JSON.stringify({ type: 'CLEAR' }))
  }

  const getRoundInfo = () => {
    if (!gameState?.currentRound) return 'Waiting...'
    const maxRounds = gameState.totalRounds || gameState.maxRounds || '?'
    return `Round ${gameState.currentRound}/${maxRounds}`
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-gray-50 overflow-hidden select-none overscroll-none">
      <motion.header 
        className="flex h-14 lg:h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6 shadow-sm shrink-0 z-20"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-2 lg:gap-4">
          <motion.button 
            onClick={onBack}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-lg bg-gray-100 p-2 lg:px-3 lg:py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <ArrowLeft size={18} />
            <span className="hidden lg:inline">Back</span>
          </motion.button>
          
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <span className="text-sm lg:text-lg font-bold text-gray-900">
              {getRoundInfo()}
            </span>
          </div>
        </div>
        
        <div className="flex flex-1 justify-center mx-2">
          <div className="rounded-xl bg-gray-100 px-4 py-1 lg:px-8 lg:py-2 text-center truncate max-w-[150px] lg:max-w-none">
            {isMyTurn ? (
              <span className="text-lg lg:text-2xl font-bold tracking-widest text-indigo-600 truncate">
                {gameState?.currentWord || '...'}
              </span>
            ) : (
              <span className="text-lg lg:text-2xl font-bold tracking-[0.3em] text-gray-800 truncate">
                {gameState?.hintWord || '_ _ _'}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden lg:flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1">
            <span className="text-xs font-bold text-amber-700">ROOM</span>
            <span className="font-mono text-base font-bold text-amber-600">{roomId}</span>
            <button onClick={copyRoomCode} className="ml-2">
              {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-amber-600" />}
            </button>
          </div>

          <motion.div 
            animate={{ scale: timer <= 10 ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.5, repeat: timer <= 10 ? Infinity : 0 }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2 py-1 lg:px-3 lg:py-1.5 font-bold text-white shadow-md",
              timer <= 10 ? "bg-red-500" : "bg-blue-500"
            )}
          >
            <Clock size={16} />
            <span className="text-base lg:text-lg">{timer}</span>
          </motion.div>
        </div>
      </motion.header>

      <main className="flex-1 relative overflow-hidden lg:p-4 lg:flex lg:gap-4">
        
        <div className={cn(
          "absolute inset-0 lg:static lg:w-64 lg:flex flex-col bg-white lg:rounded-xl lg:shadow-sm lg:ring-1 lg:ring-gray-200 z-10",
          activeTab === 'rank' ? 'flex' : 'hidden lg:flex'
        )}>
          <div className="flex items-center justify-center gap-2 border-b border-gray-100 p-3 text-sm font-bold text-gray-700 shrink-0">
            <Users size={16} />
            Players ({gameState?.players?.length || 0})
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {gameState?.players?.sort((a, b) => b.score - a.score).map((player, idx) => (
              <div 
                key={player.sessionId} 
                className={cn(
                  "mb-1.5 flex items-center gap-2 rounded-lg p-2",
                  player.sessionId === mySessionId ? "bg-blue-50 ring-1 ring-blue-200" : "bg-gray-50",
                  player.sessionId === gameState.currentDrawerSessionId && "ring-2 ring-amber-400"
                )}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                  {idx + 1}
                </span>
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-sm font-bold text-gray-900">{player.username}</div>
                  <div className="text-xs font-medium text-gray-500">{player.score} pts</div>
                </div>
                {player.sessionId === gameState.currentDrawerSessionId && <span>✏️</span>}
              </div>
            ))}
          </div>
        </div>

        <div className={cn(
          "absolute inset-0 lg:static lg:flex-1 flex flex-col gap-2 lg:gap-4 z-0",
          activeTab === 'canvas' ? 'flex' : 'hidden lg:flex'
        )}>
          <div className="relative flex-1 bg-white lg:rounded-2xl lg:shadow-sm lg:ring-1 lg:ring-gray-200 overflow-hidden touch-none">
            <canvas
              ref={canvasRef}
              className="h-full w-full cursor-crosshair touch-none block"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{ touchAction: 'none' }}
            />
            
            {(!gameState?.isGameRunning && !gameState?.gameRunning && !gameState?.currentDrawerSessionId) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 backdrop-blur-sm p-4">
                <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900">WAITING...</h2>
                  
                  <div className="w-full rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-6">
                    <div className="mb-2 text-xs font-bold text-amber-800 uppercase">Room Code</div>
                    <div className="flex items-center justify-center gap-3">
                      <span className="font-mono text-4xl font-black tracking-widest text-amber-600">{roomId}</span>
                      <button
                        onClick={copyRoomCode}
                        className="rounded-lg bg-blue-500 p-2 text-white hover:bg-blue-600"
                      >
                        {copiedCode ? <Check size={20} /> : <Copy size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="font-medium text-gray-500">
                    {gameState?.players?.length || 0} player(s) ready
                  </div>

                  <button
                    onClick={handleStartGame}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-lg font-bold text-white shadow-lg active:scale-95"
                  >
                    <Play size={20} fill="currentColor" />
                    START GAME
                  </button>
                </div>
              </div>
            )}
          </div>

          {isMyTurn && (
            <div className="shrink-0 bg-white p-2 lg:p-3 lg:rounded-xl lg:shadow-sm lg:ring-1 lg:ring-gray-200 overflow-x-auto">
              <div className="flex items-center gap-3 min-w-max px-2">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setCurrentTool('pen')}
                    className={cn("p-2 rounded-md", currentTool === 'pen' ? "bg-white shadow-sm text-blue-600" : "text-gray-500")}
                  >
                    <Pen size={18} />
                  </button>
                  <button
                    onClick={() => setCurrentTool('eraser')}
                    className={cn("p-2 rounded-md", currentTool === 'eraser' ? "bg-white shadow-sm text-red-600" : "text-gray-500")}
                  >
                    <Eraser size={18} />
                  </button>
                  <button onClick={handleClearCanvas} className="p-2 rounded-md text-gray-500 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="w-px h-8 bg-gray-200" />

                <div className="grid grid-rows-2 grid-flow-col gap-0.5 bg-gray-200 p-1 rounded-lg">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      onClick={() => { setCurrentColor(color); setCurrentTool('pen'); }}
                      className={cn(
                        "w-6 h-6 rounded-sm border border-gray-300 hover:scale-110 transition-transform",
                        currentColor === color && currentTool === 'pen' ? "ring-2 ring-gray-900 z-10" : ""
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className="w-px h-8 bg-gray-200" />

                <div className="flex items-center gap-1">
                  {brushSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setBrushSize(size)}
                      className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-md",
                        brushSize === size ? "bg-blue-100 ring-1 ring-blue-500" : "bg-gray-50"
                      )}
                    >
                      <div className="rounded-full bg-gray-900" style={{ width: size / 2, height: size / 2 }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={cn(
          "absolute inset-0 lg:static lg:w-80 lg:flex flex-col bg-white lg:rounded-2xl lg:shadow-sm lg:ring-1 lg:ring-gray-200 z-10",
          activeTab === 'chat' ? 'flex' : 'hidden lg:flex'
        )}>
          <div className="flex items-center justify-center gap-2 border-b border-gray-100 p-3 font-bold text-gray-700 shrink-0">
            <MessageSquare size={18} />
            Chat
          </div>
          <div className="flex items-center justify-center gap-2 border-b border-gray-100 px-3 py-2 bg-amber-50 shrink-0">
            <span className="text-[10px] font-bold text-amber-700">ROOM CODE:</span>
            <span className="font-mono text-sm font-bold text-amber-600">{roomId}</span>
            <button onClick={copyRoomCode} className="ml-1 active:scale-95">
              {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-amber-600" />}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50 p-3">
            <div className="flex flex-col gap-2">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm shadow-sm",
                    msg.type === 'SYSTEM' ? "bg-blue-50 text-blue-800 border border-blue-100 text-center text-xs" : 
                    msg.type === 'GUESS_CORRECT' ? "bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold text-center" : 
                    "bg-white text-gray-800 border border-gray-100"
                  )}
                >
                  {msg.type !== 'SYSTEM' && msg.type !== 'GUESS_CORRECT' && (
                    <span className="font-bold text-indigo-600 block text-xs mb-0.5">{msg.sender}</span>
                  )}
                  <span>{msg.content}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="border-t border-gray-100 p-3 shrink-0">
            <input
              id="chat-input"
              type="text"
              placeholder={isMyTurn ? "You can't guess!" : "Type guess..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isMyTurn}
              className={cn(
                "w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium outline-none transition-all",
                isMyTurn ? "cursor-not-allowed opacity-50" : "focus:border-indigo-500 focus:bg-white"
              )}
            />
          </div>
        </div>
      </main>

      <nav className="lg:hidden flex items-center justify-around bg-white border-t border-gray-200 px-2 py-2 shrink-0 z-30 pb-safe">
        <button 
          onClick={() => setActiveTab('rank')}
          className={cn("flex flex-col items-center p-2 rounded-lg", activeTab === 'rank' ? "text-indigo-600 bg-indigo-50" : "text-gray-500")}
        >
          <Users size={20} />
          <span className="text-[10px] font-bold mt-1">Rank</span>
        </button>
        <button 
          onClick={() => setActiveTab('canvas')}
          className={cn("flex flex-col items-center p-2 rounded-lg", activeTab === 'canvas' ? "text-indigo-600 bg-indigo-50" : "text-gray-500")}
        >
          <Palette size={20} />
          <span className="text-[10px] font-bold mt-1">Draw</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={cn("flex flex-col items-center p-2 rounded-lg", activeTab === 'chat' ? "text-indigo-600 bg-indigo-50" : "text-gray-500")}
        >
          <div className="relative">
            <MessageSquare size={20} />
          </div>
          <span className="text-[10px] font-bold mt-1">Chat</span>
        </button>
      </nav>

      <AnimatePresence>
        {showWordChoice && gameState?.wordChoices && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-center mb-4">Choose a Word</h2>
              <div className="flex flex-col gap-3">
                {gameState.wordChoices.map((word, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      stompClient.send(`/app/chooseWord/${roomId}`, {}, JSON.stringify({ word }))
                      setShowWordChoice(false)
                    }}
                    className="w-full rounded-xl bg-indigo-600 py-3 text-lg font-bold text-white shadow-md active:scale-95"
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGameOver && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
              <h1 className="text-2xl font-bold mb-4">Game Over!</h1>
              <div className="space-y-2 mb-6">
                {gameState?.players?.sort((a, b) => b.score - a.score).slice(0, 3).map((player, idx) => (
                  <div key={player.sessionId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-500">#{idx + 1}</span>
                      <span className="font-bold">{player.username}</span>
                    </div>
                    <span className="font-bold text-indigo-600">{player.score}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={onBack}
                className="w-full rounded-xl bg-gray-900 py-3 text-white font-bold"
              >
                Back to Menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
