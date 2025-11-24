package com.example.scribble_backend.service;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.example.scribble_backend.model.GameRoom;
import com.example.scribble_backend.model.GameRoomConfig;
import com.example.scribble_backend.model.Player;

@Service
public class GameService {

    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();
    // Added more words for better testing
    private final List<String> wordList = Arrays.asList("apple", "banana", "house", "car", "tree", "dog", "cat", "computer", "java", "spring");

    // --- MODIFIED: Accepts a specific roomId and configuration ---
    public GameRoom createRoom(String roomId, String playerName, String sessionId, GameRoomConfig config) {
        GameRoom room = new GameRoom();
        room.setRoomId(roomId); // Use the ID provided by the frontend
        
        // Apply configuration if provided
        if (config != null) {
            room.setLanguage(config.getLanguage());
            room.setScoringMode(config.getScoringMode());
            room.setDrawingTime(config.getDrawingTime());
            room.setMaxRounds(config.getRounds());
            room.setMaxPlayers(config.getMaxPlayers());
            room.setPlayersPerIpLimit(config.getPlayersPerIpLimit());
            room.setCustomWordsPerTurn(config.getCustomWordsPerTurn());
            room.setCustomWords(config.getCustomWords());
            room.setPrivate(config.isPrivate());
            room.setLobbyName(config.getLobbyName());
            room.setRoundTime(config.getDrawingTime());
        }
        
        Player host = new Player(sessionId, playerName, 0);
        room.addPlayer(host);
        rooms.put(room.getRoomId(), room);
        return room;
    }
    
    // Overloaded method for backward compatibility
    public GameRoom createRoom(String roomId, String playerName, String sessionId) {
        return createRoom(roomId, playerName, sessionId, null);
    }

    public GameRoom joinRoom(String roomId, String playerName, String sessionId) {
        GameRoom room = rooms.get(roomId);
        if (room != null) {
            // Check if room is full
            if (room.getPlayers().size() >= room.getMaxPlayers()) {
                System.out.println(">>> Room " + roomId + " is full. Max players: " + room.getMaxPlayers());
                return null;
            }
            
            // Check if player already exists to prevent duplicates on reload
            boolean playerExists = room.getPlayers().stream()
                    .anyMatch(p -> p.getSessionId().equals(sessionId));
            if (!playerExists) {
                Player newPlayer = new Player(sessionId, playerName, 0);
                room.addPlayer(newPlayer);
            }
            return room;
        }
        return null;
    }

    public GameRoom getRoom(String roomId) {
        return rooms.get(roomId);
    }

    public Collection<GameRoom> getAllPublicRooms() {
        return rooms.values().stream()
                .filter(room -> !room.isPrivate() && !room.isGameRunning())
                .toList();
    }
    
    public Collection<GameRoom> getAllRooms() {
        return rooms.values();
    }

    public void startNewRound(GameRoom room) {
        List<Player> players = room.getPlayers();
        if (players.isEmpty()) return;

        // Adjust rounds based on player count (first time only)
        if (room.getDrawerIndex() == -1) {
            room.adjustMaxRounds();
        }

        // 1. ADVANCE TO NEXT PLAYER
        room.setDrawerIndex(room.getDrawerIndex() + 1);

        // 2. CHECK IF ROUND IS OVER (Did we reach the end of the player list?)
        if (room.getDrawerIndex() >= players.size()) {
            room.setDrawerIndex(0); // Reset to first player
            room.setCurrentRound(room.getCurrentRound() + 1); // Increment Round
            System.out.println(">>> ROUND " + (room.getCurrentRound() - 1) + " COMPLETE! Starting Round " + room.getCurrentRound());
        }

        // 3. CHECK IF GAME IS OVER
        if (room.isGameOver()) {
            endGame(room);
            return;
        }

        // 4. SETUP NEXT TURN
        room.resetRoundData();
        room.setGameRunning(true);
        room.setRoundTime(60);

        // Pick new Word
        String word = wordList.get(new Random().nextInt(wordList.size()));
        room.setCurrentWord(word);

        // Set Drawer based on Index (SEQUENTIAL ROTATION)
        Player drawer = players.get(room.getDrawerIndex());
        room.setCurrentDrawerSessionId(drawer.getSessionId());

        int totalTurns = room.getMaxRounds() * players.size();
        int currentTurn = (room.getCurrentRound() - 1) * players.size() + room.getDrawerIndex() + 1;
        
        System.out.println(">>> NEW TURN STARTED");
        System.out.println("    Turn: " + currentTurn + "/" + totalTurns);
        System.out.println("    Round: " + room.getCurrentRound() + "/" + room.getMaxRounds());
        System.out.println("    Word: " + word);
        System.out.println("    Drawer: " + drawer.getUsername() + " (Player " + (room.getDrawerIndex() + 1) + "/" + players.size() + ")");
        System.out.println("    Initial Hint: " + room.getHintWord());
    }
    
    public void endGame(GameRoom room) {
        room.setGameRunning(false);
        room.setCurrentWord("GAME OVER");
        room.setCurrentDrawerSessionId(null);
        
        System.out.println(">>> GAME ENDED - Final Scores:");
        List<Player> leaderboard = room.getPlayers().stream()
                .sorted((p1, p2) -> Integer.compare(p2.getScore(), p1.getScore()))
                .collect(java.util.stream.Collectors.toList());
        
        leaderboard.forEach(p -> System.out.println("    " + p.getUsername() + ": " + p.getScore() + " points"));
        
        if (!leaderboard.isEmpty()) {
            System.out.println("    🏆 WINNER: " + leaderboard.get(0).getUsername());
        }
    }

    public boolean processGuess(String roomId, String guess, String senderSessionId) {
        GameRoom room = rooms.get(roomId);
        if (room == null || !room.isGameRunning()) return false;
        if (senderSessionId.equals(room.getCurrentDrawerSessionId())) return false; // Drawer cannot guess
        if (room.getPlayersWhoGuessedCorrectly().contains(senderSessionId)) return false; // Already guessed

        boolean isCorrect = room.getCurrentWord() != null && room.getCurrentWord().equalsIgnoreCase(guess.trim());
        
        if (isCorrect) {
            // Mark player as having guessed correctly
            room.getPlayersWhoGuessedCorrectly().add(senderSessionId);
            
            // Calculate points based on time remaining
            int timeElapsed = 60 - room.getRoundTime();
            int points = calculatePoints(timeElapsed, room.getPlayersWhoGuessedCorrectly().size());
            
            // Award points to guesser
            Player guesser = room.getPlayerBySessionId(senderSessionId);
            if (guesser != null) {
                guesser.setScore(guesser.getScore() + points);
                System.out.println(">>> " + guesser.getUsername() + " guessed correctly! +" + points + " points (time: " + timeElapsed + "s)");
            }
            
            // Award points to drawer (10 points per correct guess)
            Player drawer = room.getPlayerBySessionId(room.getCurrentDrawerSessionId());
            if (drawer != null) {
                drawer.setScore(drawer.getScore() + 10);
                System.out.println(">>> Drawer " + drawer.getUsername() + " gets +10 points");
            }
        }
        
        return isCorrect;
    }
    
    // Scoring: Faster guess = more points, first guesser gets bonus
    private int calculatePoints(int timeElapsed, int guessPosition) {
        int basePoints = 50;
        int timeBonus = Math.max(0, (60 - timeElapsed) * 2); // Up to 120 points for fast guesses
        int positionBonus = guessPosition == 1 ? 50 : (guessPosition == 2 ? 25 : 0); // Bonus for being first/second
        
        return basePoints + timeBonus + positionBonus;
    }
}