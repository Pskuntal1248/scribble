# Scribble Game - React Frontend

A modern React-based frontend for the Scribble drawing and guessing game.

## Features

- 🎨 Beautiful doodle-patterned background
- 🎮 Complete lobby system with game configuration
- ✏️ Real-time drawing canvas
- 💬 Live chat system
- 🏆 Dynamic scoreboard
- ⏱️ Timer and hint system
- 🔄 Turn-based gameplay with fair rotation

## Setup Instructions

### 1. Install Dependencies

```bash
cd scribble-frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will run on `http://localhost:3000`

### 3. Make sure Backend is Running

The Spring Boot backend should be running on `http://localhost:8080`

## Game Flow

1. **Login Screen**: Enter your nickname
2. **Lobby Screen**: 
   - Create a public or private lobby with custom settings
   - Join existing lobbies by code or from the public list
3. **Game Screen**:
   - Drawer draws the word shown
   - Guessers type their guesses in chat
   - Points awarded based on guess speed
   - Sequential turn rotation ensures everyone draws

## Technologies

- React 18
- Vite
- SockJS & STOMP for WebSockets
- HTML5 Canvas for drawing
- CSS3 for styling

## Background Pattern

The app features a custom doodle pattern background that matches the Scribble.io aesthetic with icons like:
- Stars
- Lightning bolts
- Hearts
- Flowers
- Pizza slices
- Ice cream cones
- And more!

## Controls

### Drawing (When it's your turn)
- Click and drag on canvas to draw
- Select colors from the palette
- Use CLEAR button to reset canvas

### Guessing (When others draw)
- Type your guess in the chat
- First correct guess gets bonus points
- Canvas is view-only

## Scoring

- Base points: 50
- Time bonus: Up to 120 points for fast guesses
- Position bonus: 50 for first, 25 for second
- Drawer bonus: 10 points per correct guess

Enjoy the game! 🎨✨
