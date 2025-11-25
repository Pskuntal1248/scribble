import { motion } from 'framer-motion'
import { Gamepad2, Sparkles, Users } from 'lucide-react'
import { cn } from '../lib/utils'

export default function LoginScreen({ username, setUsername, onPlayClick }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-md space-y-8 rounded-2xl bg-white/90 p-8 shadow-2xl backdrop-blur-sm ring-1 ring-black/5"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            className="mb-4 inline-block text-6xl"
          >
            🎨
          </motion.div>
          <h2 className="mb-2 flex items-center justify-center gap-3 text-4xl font-extrabold tracking-tight text-gray-900">
            <Sparkles className="h-8 w-8 text-amber-500" />
            Scribble
            <Sparkles className="h-8 w-8 text-amber-500" />
          </h2>
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500">
            <Users className="h-4 w-4" />
            Draw, Guess & Have Fun!
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="space-y-6"
        >
          <div className="relative">
            <input
              type="text"
              placeholder="Enter your nickname..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onPlayClick()}
              className={cn(
                "w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-5 py-4 text-lg font-medium outline-none transition-all",
                "focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              )}
            />
          </div>

          <motion.button 
            onClick={onPlayClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all",
              "hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/30"
            )}
          >
            <Gamepad2 className="h-6 w-6" />
            Start Playing
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center text-sm text-blue-800"
        >
          <strong>💡 Quick Tip:</strong> Use Q (pen), E (eraser), 1-4 (brush sizes) while drawing!
        </motion.div>
      </motion.div>
    </div>
  )
}
