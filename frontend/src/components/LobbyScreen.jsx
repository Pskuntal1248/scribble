import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Plus, 
  Lock, 
  Globe, 
  Users, 
  Clock, 
  Trophy, 
  RefreshCw,
  ChevronRight,
  Settings,
  Hash,
  Languages,
  Zap
} from 'lucide-react'
import { cn } from '../lib/utils'

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
    <motion.div 
      className="flex h-screen w-full flex-col bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 flex items-center">
        <motion.button 
          onClick={onBack}
          whileHover={{ scale: 1.05, x: -3 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:ring-gray-300"
        >
          <ArrowLeft size={18} />
          Back
        </motion.button>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-12">
        {/* Create Lobby Panel */}
        <motion.div 
          className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 lg:col-span-4 xl:col-span-3"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
            <Settings className="text-indigo-500" size={24} />
            Create Lobby
          </h3>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Languages size={16} /> Language
              </label>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-lg border-gray-200 bg-gray-50 p-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option>English</option>
                <option>German</option>
                <option>French</option>
                <option>Italian</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Trophy size={16} /> Scoring
              </label>
              <select 
                value={scoring} 
                onChange={(e) => setScoring(e.target.value)}
                className="w-full rounded-lg border-gray-200 bg-gray-50 p-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option>Chill</option>
                <option>Normal</option>
                <option>Competitive</option>
              </select>
            </div>

            {[
              { label: 'Drawing Time', icon: Clock, value: drawTime, setter: setDrawTime, min: 30, max: 300, step: 10 },
              { label: 'Rounds', icon: Zap, value: rounds, setter: setRounds, min: 1, max: 10, step: 1 },
              { label: 'Max Players', icon: Users, value: maxPlayers, setter: setMaxPlayers, min: 2, max: 50, step: 2 },
              { label: 'Players per IP', icon: Hash, value: ipLimit, setter: setIpLimit, min: 1, max: 10, step: 1 },
              { label: 'Custom Words', icon: null, emoji: '✏️', value: customWords, setter: setCustomWords, min: 0, max: 5, step: 1 },
            ].map((setting, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  {setting.icon ? <setting.icon size={16} /> : <span>{setting.emoji}</span>}
                  {setting.label}
                </label>
                <div className="flex items-center gap-2">
                  <motion.button 
                    onClick={() => adjustValue(setting.setter, setting.value, -setting.step, setting.min, setting.max)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    -
                  </motion.button>
                  <span className="w-8 text-center font-medium text-gray-900">{setting.value}</span>
                  <motion.button 
                    onClick={() => adjustValue(setting.setter, setting.value, setting.step, setting.min, setting.max)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                  >
                    +
                  </motion.button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <motion.button 
              onClick={() => createRoom(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600"
            >
              <Globe size={20} />
              Create Public Lobby
            </motion.button>
            <motion.button 
              onClick={() => createRoom(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-600"
            >
              <Lock size={20} />
              Create Private Lobby
            </motion.button>
          </div>
        </motion.div>

        {/* Join Lobby Panel */}
        <motion.div 
          className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 lg:col-span-8 xl:col-span-9"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
              <Plus className="text-indigo-500" size={24} />
              Join Private Lobby
            </h3>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter Room Code..."
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && joinLobbyByCode()}
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <motion.button 
                onClick={joinLobbyByCode}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 rounded-xl bg-indigo-500 px-8 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-600"
              >
                <Lock size={18} />
                Join
              </motion.button>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
              <h4 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Globe className="text-indigo-500" size={20} />
                Public Lobbies
              </h4>
              <motion.button 
                onClick={refreshLobbies}
                whileHover={{ scale: 1.05, rotate: 180 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
              >
                <RefreshCw size={16} />
                Refresh
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              <AnimatePresence mode="wait">
                {lobbies.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full flex-col items-center justify-center text-center text-gray-400"
                  >
                    <Globe size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">No public lobbies available</p>
                    <p className="text-sm">Create one to get started!</p>
                  </motion.div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {lobbies.map((lobby, index) => (
                      <motion.div 
                        key={lobby.roomId} 
                        onClick={() => joinRoom(lobby.roomId)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-500 hover:shadow-md"
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <h4 className="font-bold text-gray-900 group-hover:text-indigo-600">
                            {lobby.lobbyName || 'Game Room'}
                          </h4>
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                            Public
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Users size={14} />
                            <span>{lobby.players.length}/{lobby.maxPlayers} Players</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} />
                            <span>{lobby.drawingTime}s Draw Time</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap size={14} />
                            <span>{lobby.maxRounds} Rounds</span>
                          </div>
                        </div>

                        <motion.button 
                          className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg bg-gray-50 py-2 text-sm font-bold text-gray-700 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                        >
                          Join Room <ChevronRight size={16} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
