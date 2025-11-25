# 🎨 Scribble - Multiplayer Drawing Game

A real-time multiplayer drawing and guessing game built with React and Spring Boot. Players take turns drawing while others try to guess the word!

## ✨ Features

- 🎮 **Real-time Multiplayer** - Play with friends using WebSocket connections
- 🎨 **Drawing Canvas** - Smooth drawing experience with multiple colors and brush sizes
- 💬 **Live Chat** - Real-time chat for guessing and communication
- 🏆 **Leaderboard** - Track scores and rankings
- ⏱️ **Timer System** - 60-second rounds with dynamic hints
- 🎯 **Game Modes** - Customizable rounds and turn duration
- 🌟 **Modern UI** - Futuristic glassmorphism design with neon effects

## 🚀 Tech Stack

### Backend
- **Spring Boot 4.0.0** - Java framework
- **WebSocket (STOMP)** - Real-time communication
- **Maven** - Dependency management
- **Java 21+** - Programming language

### Frontend
- **React 18** - UI library
- **Vite 5** - Build tool
- **SockJS & STOMP.js** - WebSocket client
- **Modern CSS** - Glassmorphism and animations

## 📋 Prerequisites

- Java 21 or higher
- Node.js 18 or higher
- Maven 3.6+

## 🛠️ Installation

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/Pskuntal1248/scribble.git
cd scribble
```

2. Build and run the Spring Boot backend:
```bash
./mvnw clean package -DskipTests
./mvnw spring-boot:run
```

The backend will start on `http://localhost:8080`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd scribble-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

## 🎮 How to Play

1. **Login** - Enter your username
2. **Create/Join Room** - Create a new room or join an existing one with a room code
3. **Start Game** - Wait for all players to join, then start the game
4. **Draw** - If you're the drawer, select colors and draw the word shown
5. **Guess** - If you're a guesser, type your guess in the chat
6. **Score** - Earn points for correct guesses and fast answers
7. **Win** - The player with the highest score wins!

## 🎯 Game Rules

- Each player takes turns drawing
- Drawers see the full word, guessers see hints
- Hints reveal over time (45s, 30s, 15s remaining)
- First to guess correctly gets bonus points
- Points are awarded based on speed
- Game continues for the configured number of rounds

## 📁 Project Structure

```
scribble/
├── src/main/java/com/example/scribble_backend/
│   ├── config/          # WebSocket configuration
│   ├── controller/      # REST and WebSocket controllers
│   ├── model/          # Data models (GameRoom, Player, etc.)
│   ├── scheduler/      # Game loop and timing
│   └── service/        # Business logic
├── scribble-frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── App.jsx     # Main app component
│   │   └── App.css     # Styling
│   └── vite.config.js  # Vite configuration
└── pom.xml             # Maven dependencies
```

## 🔧 Configuration

### Backend Configuration (`application.properties`)
```properties
server.port=8080
```

### Frontend Configuration (`vite.config.js`)
```javascript
server: {
  port: 3000,
  proxy: {
    '/ws': {
      target: 'http://localhost:8080',
      ws: true
    }
  }
}
```

## 🎨 Features in Detail

### Drawing Tools
- 18 colors including black, white, and vibrant palette
- 4 brush sizes (2px, 5px, 10px, 15px)
- Eraser (white color)
- Clear canvas button

### Scoring System
- **Time Bonus**: Faster guesses earn more points
- **Position Bonus**: First guesser gets extra points
- **Fair Rotation**: Sequential turn system ensures everyone draws

### UI/UX
- **Glassmorphism Design**: Modern translucent panels with backdrop blur
- **Neon Effects**: Dynamic glowing borders and animations
- **Responsive Layout**: Adapts to different screen sizes
- **Visual Feedback**: Color-coded messages, hover effects, and smooth transitions

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

## 👨‍💻 Author

**Pskuntal1248**

## 🙏 Acknowledgments

- Inspired by Skribbl.io
- Built with modern web technologies
- Designed for fun and learning

---

**Enjoy playing Scribble! 🎨✨**
