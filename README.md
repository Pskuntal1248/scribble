# 🎨 Scribble - Multiplayer Drawing & Guessing Game

A real-time multiplayer drawing and guessing game built with Spring Boot and React. Players take turns drawing while others try to guess the word. Fast and accurate guesses earn more points!

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0.0-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-yellow.svg)](https://stomp.github.io/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Game Rules](#-game-rules)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🎮 Core Gameplay
- **Real-time Drawing**: Smooth canvas drawing with synchronized strokes across all players
- **Turn-based System**: Automatic sequential drawer rotation
- **Smart Hints**: Progressive letter reveals at 45s, 30s, and 15s
- **Time-based Scoring**: Faster guesses earn more points
- **Position Bonuses**: First and second guessers get extra points

### 🎯 Game Modes
- **Chill Mode**: 0.5x score multiplier - Casual, low-pressure gameplay
- **Normal Mode**: 1.0x score multiplier - Balanced competitive play
- **Competitive Mode**: 1.5x score multiplier - High-stakes, intense matches

### 🌍 Multi-Language Support
- **5 Languages**: English (merged US & GB), German, French, Italian
- **~25,000 Words**: Extensive word lists for variety
- **Custom Words**: Add your own words for themed games

### 🔒 Lobby Features
- **Private & Public Lobbies**: Create invite-only or open rooms
- **Configurable Settings**:
  - Drawing time (30-180 seconds)
  - Number of rounds (1-10)
  - Max players (2-24)
  - Players per IP limit (prevent multi-accounting)
  - Custom word lists
  - Scoring mode selection

### 🛡️ Robust Infrastructure
- **Auto-Cleanup**: Removes inactive rooms (15min public, 60min private)
- **Disconnect Handling**: Automatic game continuation when players leave
- **Late Joiner Sync**: Canvas history automatically sent to new players
- **REST Fallback**: State synchronization via REST API if WebSocket is slow
- **IP Tracking**: Enforce fair play with IP-based player limits

### 🎨 Modern UI
- **Gradient Backgrounds**: Eye-catching visual design
- **Responsive Canvas**: Works on all screen sizes
- **Color Palette**: 20 pre-selected colors + color picker
- **Brush Sizes**: 4 sizes (8px, 16px, 24px, 32px) with keyboard shortcuts
- **Keyboard Controls**: 
  - `Q` - Pen tool
  - `E` - Eraser tool
  - `1-4` - Brush sizes

---

## 🛠️ Tech Stack

### Backend
- **Java 21** - Latest LTS version
- **Spring Boot 4.0.0** - Application framework
- **Spring WebSocket** - Real-time communication (STOMP protocol)
- **Lombok** - Reduce boilerplate code
- **Maven** - Dependency management

### Frontend
- **React 18.3** - UI framework
- **Vite 5.4.21** - Build tool & dev server
- **SockJS** - WebSocket client library
- **Stomp.js** - STOMP protocol for WebSocket
- **HTML5 Canvas** - Drawing surface

### Communication
- **WebSocket (STOMP)** - Primary real-time communication
- **REST API** - Fallback for state synchronization
- **CORS** - Cross-origin resource sharing enabled

---

## 📁 Project Structure

```
scribble/
├── backend/                          # Spring Boot backend
│   ├── src/main/java/com/example/scribble_backend/
│   │   ├── ScribbleBackendApplication.java    # Main entry point
│   │   ├── config/
│   │   │   ├── WebSocketConfig.java           # STOMP WebSocket setup
│   │   │   ├── HttpHandshakeInterceptor.java  # IP capture
│   │   │   └── WebSocketEventListener.java    # Disconnect handler
│   │   ├── controller/
│   │   │   ├── GameController.java            # WebSocket & REST endpoints
│   │   │   └── LobbyController.java           # Lobby management
│   │   ├── service/
│   │   │   └── GameService.java               # Game logic & room management
│   │   ├── scheduler/
│   │   │   └── GameLoop.java                  # Timer & hints (1s interval)
│   │   └── model/
│   │       ├── GameRoom.java                  # Room state
│   │       ├── Player.java                    # Player data
│   │       ├── ChatMessage.java               # Chat DTO
│   │       ├── DrawMessage.java               # Drawing DTO
│   │       ├── GameRoomConfig.java            # Lobby config
│   │       └── VoteMessage.java               # Vote DTO
│   ├── src/main/resources/
│   │   ├── application.properties             # Backend config
│   │   ├── en_us.txt                          # English (US) words
│   │   ├── en_gb.txt                          # English (GB) words
│   │   ├── de.txt                             # German words
│   │   ├── fr.txt                             # French words
│   │   └── it.txt                             # Italian words
│   └── pom.xml                                # Maven dependencies
│
├── frontend/                         # React frontend
│   ├── src/
│   │   ├── App.jsx                            # Root component
│   │   ├── App.css                            # Global styles
│   │   └── components/
│   │       ├── LoginScreen.jsx                # Username entry
│   │       ├── LobbyScreen.jsx                # Create lobby
│   │       └── GameScreen.jsx                 # Main game interface
│   ├── dist/                                  # Production build
│   ├── package.json                           # npm dependencies
│   └── vite.config.js                         # Vite configuration
│
├── PROJECT_DOCUMENTATION.md          # Detailed technical docs
└── README.md                         # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Java 21+** - [Download](https://www.oracle.com/java/technologies/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Maven 3.9+** - [Download](https://maven.apache.org/download.cgi)
- **Git** - [Download](https://git-scm.com/downloads)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/Pskuntal1248/scribble.git
cd scribble
```

#### 2. Backend Setup

```bash
cd backend

# Build the project (skips tests for faster build)
./mvnw clean package -DskipTests

# Run the backend server
java -jar target/scribble-backend-0.0.1-SNAPSHOT.jar
```

**Backend will start on:** `http://localhost:8080`

**Endpoints:**
- WebSocket: `ws://localhost:8080/ws`
- REST API: `http://localhost:8080/api/room/{roomId}/state`

#### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Production build
npm run build
```

**Frontend will start on:** `http://localhost:3000`

#### 4. Open in Browser

Navigate to `http://localhost:3000` and start playing!

---

## 🎲 Game Rules

### How to Play

1. **Enter Username**: Choose a unique display name
2. **Create or Join Lobby**: 
   - **Create**: Set up a new game with custom settings
   - **Join**: Enter a 6-digit room code to join existing game
3. **Game Starts**: Host clicks "START GAME" button
4. **Drawing Turn**:
   - See the word you need to draw
   - Use mouse to draw on canvas
   - Choose colors and brush sizes
5. **Guessing Turn**:
   - Watch the drawer's artwork
   - Type guesses in chat
   - See hints as letters are revealed
6. **Scoring**: 
   - Correct guess awards points based on time
   - First guesser gets +50 bonus
   - Second guesser gets +25 bonus
   - Drawer gets +10 per correct guess
7. **Turn Rotation**: Each player draws once per round
8. **Game End**: After all rounds, highest score wins!

### Scoring Formula

```
Base Points: 50
Time Bonus: (MaxTime - TimeElapsed) × 2
Position Bonus: 1st = +50, 2nd = +25, 3rd+ = 0

Total = (Base + Time Bonus + Position Bonus) × Mode Multiplier

Mode Multipliers:
- Chill: 0.5x
- Normal: 1.0x
- Competitive: 1.5x
```

**Example:**
- 60s drawing time, guessed at 45s (15s elapsed)
- First to guess in Normal mode
- Points = `(50 + (60-15)×2 + 50) × 1.0 = 190 points`

---

## ⚙️ Configuration

### Backend Configuration

Edit `backend/src/main/resources/application.properties`:

```properties
# Server port
server.port=8080

# Disable Spring banner
spring.main.banner-mode=off

# Enable STOMP WebSocket
spring.websocket.sockjs.enabled=true
```

### Frontend Configuration

Edit `frontend/src/App.jsx` to change URLs:

```javascript
const BACKEND_URL = 'http://localhost:8080';
const WS_URL = `${BACKEND_URL}/ws`;
const API_URL = `${BACKEND_URL}/api`;
```

### Room Cleanup Settings

Edit `backend/src/main/java/.../scheduler/GameLoop.java`:

```java
// Public rooms: 15 minutes inactive → deleted
long publicThreshold = 15 * 60 * 1000;

// Private rooms: 60 minutes inactive → deleted
long privateThreshold = 60 * 60 * 1000;
```

---

## 📡 API Documentation

### WebSocket Endpoints (STOMP)

#### Client → Server

| Endpoint | Payload | Description |
|----------|---------|-------------|
| `/app/join` | `{username, roomId, action, config}` | Create or join room |
| `/app/start/{roomId}` | - | Start the game |
| `/app/draw/{roomId}` | `{type, prevX, prevY, currX, currY, color, lineWidth}` | Send drawing stroke |
| `/app/chat/{roomId}` | `{content, sender}` | Send chat message or guess |

#### Server → Client

| Topic | Payload | Description |
|-------|---------|-------------|
| `/topic/room/{roomId}/state` | `GameRoom` | Full game state update |
| `/topic/room/{roomId}/draw` | `DrawMessage` | Drawing stroke broadcast |
| `/topic/room/{roomId}/chat` | `ChatMessage` | Chat message broadcast |
| `/topic/room/{roomId}/time` | `int` | Timer countdown |
| `/user/queue/draw` | `DrawMessage[]` | Personal draw history sync |

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/room/{roomId}/state` | Get current room state (fallback) |

**CORS:** Enabled for `http://localhost:3000`

---

## 🖼️ Screenshots

### Lobby Creation
Create a custom game with your preferred settings.

```
┌─────────────────────────────────────┐
│  CREATE LOBBY                        │
│                                      │
│  Language: [English ▼]              │
│  Scoring Mode: [Normal ▼]           │
│  Drawing Time: [60s]                │
│  Rounds: [3]                        │
│  Max Players: [8]                   │
│  Players per IP: [2]                │
│  Custom Words: [Optional]           │
│  Private Lobby: [☐]                 │
│                                      │
│  [CREATE GAME]                      │
└─────────────────────────────────────┘
```

### Game Interface
Draw, guess, and chat in real-time.

```
┌──────────────────────────────────────────────────────┐
│  Room: 123456        Round 2/3        Timer: 45s    │
├──────────────┬───────────────────────┬───────────────┤
│  PLAYERS     │    CANVAS (DRAWING)   │    CHAT      │
│              │                       │              │
│  #1 Alice    │      🎨 Canvas        │  System:     │
│  234 pts 👑  │      [Drawing Area]   │  Game Start! │
│              │                       │              │
│  #2 Bob ✏️   │   Hint: _ _ _ _ _    │  Alice: car? │
│  156 pts     │                       │  System:     │
│              │   [Color Palette]     │  Bob guessed!│
│  #3 You      │   [Brush Sizes]       │              │
│  149 pts     │   [Tools: Pen/Eraser] │  Type guess..│
└──────────────┴───────────────────────┴───────────────┘
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/AmazingFeature`
3. **Commit your changes**: `git commit -m 'Add AmazingFeature'`
4. **Push to branch**: `git push origin feature/AmazingFeature`
5. **Open a Pull Request**

### Code Style
- **Backend**: Follow Java naming conventions, use Lombok where applicable
- **Frontend**: Use functional React components with hooks
- **Comments**: Write clear, concise comments for complex logic

---

## 🐛 Known Issues

- [ ] Mobile touch drawing needs optimization
- [ ] Very fast mouse movements may miss strokes
- [ ] Canvas size not responsive on smaller screens

---

## 🛣️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Voice chat integration
- [ ] Replay system to review past games
- [ ] Achievements & player stats
- [ ] Ranked matchmaking
- [ ] Daily challenges
- [ ] Theme customization
- [ ] Emotes & reactions
- [ ] Drawing tools: shapes, fill, undo/redo
- [ ] Database persistence (currently in-memory)

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Parth Kuntal**
- GitHub: [@Pskuntal1248](https://github.com/Pskuntal1248)
- Repository: [scribble](https://github.com/Pskuntal1248/scribble)

---

## 🙏 Acknowledgments

- Inspired by [Skribbl.io](https://skribbl.io/)
- Word lists sourced from public domain dictionaries
- Built with ❤️ using Spring Boot & React

---

## 📞 Support

Having issues? Feel free to:
- Open an [Issue](https://github.com/Pskuntal1248/scribble/issues)
- Check the [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for detailed technical info

---

## 🔥 Quick Start (TL;DR)

```bash
# Clone repo
git clone https://github.com/Pskuntal1248/scribble.git
cd scribble

# Backend
cd backend
./mvnw clean package -DskipTests
java -jar target/scribble-backend-0.0.1-SNAPSHOT.jar

# Frontend (in new terminal)
cd ../frontend
npm install
npm run dev

# Open http://localhost:3000 🎉
```

---

**Made with 🎨 and ☕ | Happy Drawing!**
