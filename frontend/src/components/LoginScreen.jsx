import { motion } from 'framer-motion'
import { Gamepad2, Palette } from 'lucide-react'
import { Button, Input, Card, CardBody, CardHeader, Divider, Kbd, Chip } from "@heroui/react"
import LiquidEther from './LiquidEther'
import logo from '../logo.png'

export default function LoginScreen({ username, setUsername, onPlayClick }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gray-50">
      {/* Background LiquidEther */}
      <div className="absolute inset-0 z-0">
         <div style={{ width: '100%', height: '100%', position: 'absolute' }}>
            <LiquidEther
                colors={[ '#5227FF', '#FF9FFC', '#B19EEF' ]}
                mouseForce={20}
                cursorSize={100}
                isViscous={false}
                viscous={30}
                iterationsViscous={32}
                iterationsPoisson={32}
                resolution={0.5}
                isBounce={false}
                autoDemo={true}
                autoSpeed={0.5}
                autoIntensity={2.2}
                takeoverDuration={0.25}
                autoResumeDelay={3000}
                autoRampDuration={0.6}
            />
        </div>
      </div>

      <motion.div 
        className="z-10 w-full max-w-md px-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Card className="w-full shadow-2xl border-none bg-white/80" isBlurred>
            <CardHeader className="flex flex-col gap-2 items-center justify-center pt-8 pb-4">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-center flex flex-col items-center"
                >
                    <div className="mb-0">
                        <img src={logo} alt="Drowly Logo" className="w-72 h-auto object-contain drop-shadow-lg" />
                    </div>
                    <p className="text-default-500 font-medium -mt-4">
                        Draw. Guess. Win.
                    </p>
                </motion.div>
            </CardHeader>
            
            <Divider className="my-2" />

            <CardBody className="gap-6 p-8">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="flex flex-col gap-6"
                >
                    <Input
                        size="lg"
                        variant="bordered"
                        label="Nickname"
                        placeholder="Enter your artist name"
                        value={username}
                        onValueChange={setUsername}
                        onKeyDown={(e) => e.key === 'Enter' && onPlayClick()}
                        isClearable
                        classNames={{
                            inputWrapper: "bg-default-100/50 hover:bg-default-200/50 transition-colors border-default-200",
                            label: "text-default-600",
                            input: "text-lg font-medium text-default-900"
                        }}
                        startContent={
                            <div className="pointer-events-none flex items-center">
                                <span className="text-default-400 text-small">@</span>
                            </div>
                        }
                    />

                    <Button 
                        size="lg"
                        color="secondary"
                        variant="shadow"
                        onPress={onPlayClick}
                        className="w-full font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-500/20"
                        startContent={<Gamepad2 className="h-5 w-5" />}
                    >
                        Start Playing
                    </Button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="mt-2 flex flex-col items-center gap-3 rounded-xl bg-default-50 p-4 border border-default-100"
                >
                    <Chip color="warning" variant="flat" size="sm" className="uppercase font-bold tracking-wider">Pro Tips</Chip>
                    <div className="flex flex-wrap justify-center gap-3 text-xs text-default-500">
                        <div className="flex items-center gap-1">
                            <span>Draw</span>
                            <Kbd keys={["q"]}>Q</Kbd>
                        </div>
                        <div className="flex items-center gap-1">
                            <span>Erase</span>
                            <Kbd keys={["e"]}>E</Kbd>
                        </div>
                        <div className="flex items-center gap-1">
                            <span>Size</span>
                            <Kbd>1-4</Kbd>
                        </div>
                    </div>
                </motion.div>
            </CardBody>
        </Card>
      </motion.div>
    </div>
  )
}
