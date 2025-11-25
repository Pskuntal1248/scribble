package com.example.scribble_backend.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
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
    private final Map<String, List<String>> wordListsByLanguage = new ConcurrentHashMap<>();
    
    // Fallback words if files can't be loaded
    private final List<String> defaultWordList = Arrays.asList("apple", "banana", "house", "car", "tree", "dog", "cat", "computer", "java", "spring");
    
    public GameService() {
        // Load word lists on startup
        // Merge English (US) and English (GB) into one combined English list
        List<String> englishWords = new ArrayList<>();
        englishWords.addAll(loadWordsFromFile("en_us.txt"));
        englishWords.addAll(loadWordsFromFile("en_gb.txt"));
        wordListsByLanguage.put("English", englishWords);
        
        // Load other languages
        wordListsByLanguage.put("German", loadWordsFromFile("de.txt"));
        wordListsByLanguage.put("French", loadWordsFromFile("fr.txt"));
        wordListsByLanguage.put("Italian", loadWordsFromFile("it.txt"));
        
        System.out.println(">>> Word lists loaded:");
        wordListsByLanguage.forEach((lang, words) -> 
            System.out.println("    " + lang + ": " + words.size() + " words")
        );
    }
    
    private List<String> loadWordsFromFile(String filename) {
        List<String> words = new ArrayList<>();
        try (InputStream is = getClass().getClassLoader().getResourceAsStream(filename);
             BufferedReader reader = new BufferedReader(new InputStreamReader(is))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (!line.isEmpty()) {
                    words.add(line);
                }
            }
            System.out.println(">>> Loaded " + words.size() + " words from " + filename);
            return words;
        } catch (IOException | NullPointerException e) {
            System.err.println(">>> ERROR: Could not load " + filename + ": " + e.getMessage());
            return new ArrayList<>(defaultWordList);
        }
    }
    
    private List<String> getWordListForLanguage(String language) {
        List<String> words = wordListsByLanguage.get(language);
        if (words == null || words.isEmpty()) {
            System.out.println(">>> WARNING: No word list for language '" + language + "', using default");
            return defaultWordList;
        }
        return words;
    }

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
            
            System.out.println(">>> Room " + roomId + " created: isPrivate=" + room.isPrivate() + ", lobbyName=" + room.getLobbyName());
        } else {
            System.out.println(">>> Room " + roomId + " created with DEFAULT config (PUBLIC)");
        }
        
        Player host = new Player(sessionId, playerName, 0);
        room.addPlayer(host);
        rooms.put(room.getRoomId(), room);
        return room;
    }
    
    // Overload to accept IP address for host
    public GameRoom createRoom(String roomId, String playerName, String sessionId, GameRoomConfig config, String ipAddress) {
        GameRoom room = createRoom(roomId, playerName, sessionId, config);
        if (room != null && ipAddress != null) {
            // Set IP for host
            Player host = room.getPlayers().get(0);
            if (host != null) {
                host.setIpAddress(ipAddress);
                System.out.println(">>> Host IP tracked: " + ipAddress);
            }
        }
        return room;
    }
    
    // Overloaded method for backward compatibility
    public GameRoom createRoom(String roomId, String playerName, String sessionId) {
        System.out.println(">>> WARNING: createRoom called without config - defaulting to PUBLIC lobby");
        return createRoom(roomId, playerName, sessionId, null);
    }

    public GameRoom joinRoom(String roomId, String playerName, String sessionId, String ipAddress) {
        GameRoom room = rooms.get(roomId);
        if (room != null) {
            // Check if room is full
            if (room.getPlayers().size() >= room.getMaxPlayers()) {
                System.out.println(">>> Room " + roomId + " is full. Max players: " + room.getMaxPlayers());
                return null;
            }
            
            // Check players per IP limit
            if (ipAddress != null && room.getPlayersPerIpLimit() > 0) {
                long playersFromSameIp = room.getPlayers().stream()
                        .filter(p -> ipAddress.equals(p.getIpAddress()))
                        .count();
                if (playersFromSameIp >= room.getPlayersPerIpLimit()) {
                    System.out.println(">>> IP limit reached for " + ipAddress + ". Limit: " + room.getPlayersPerIpLimit());
                    return null;
                }
            }
            
            // Check if player already exists to prevent duplicates on reload
            boolean playerExists = room.getPlayers().stream()
                    .anyMatch(p -> p.getSessionId().equals(sessionId));
            if (!playerExists) {
                Player newPlayer = new Player(sessionId, playerName, 0);
                newPlayer.setIpAddress(ipAddress);
                room.addPlayer(newPlayer);
                System.out.println(">>> Player joined from IP: " + ipAddress);
            }
            room.updateActivity(); // Track activity
            return room;
        }
        return null;
    }
    
    // Overload for backward compatibility
    public GameRoom joinRoom(String roomId, String playerName, String sessionId) {
        return joinRoom(roomId, playerName, sessionId, null);
    }

    public GameRoom getRoom(String roomId) {
        return rooms.get(roomId);
    }

    public Collection<GameRoom> getAllPublicRooms() {
        List<GameRoom> allRooms = new ArrayList<>(rooms.values());
        System.out.println(">>> getAllPublicRooms called. Total rooms: " + allRooms.size());
        
        allRooms.forEach(room -> {
            System.out.println("    Room " + room.getRoomId() + ": isPrivate=" + room.isPrivate() + ", gameRunning=" + room.isGameRunning());
        });
        
        List<GameRoom> publicRooms = rooms.values().stream()
                .filter(room -> !room.isPrivate() && !room.isGameRunning())
                .toList();
        
        System.out.println(">>> Returning " + publicRooms.size() + " public rooms");
        return publicRooms;
    }
    
    public Collection<GameRoom> getAllRooms() {
        return rooms.values();
    }
    
    // Find room by player session ID
    public GameRoom findRoomBySessionId(String sessionId) {
        for (GameRoom room : rooms.values()) {
            if (room.getPlayers().stream().anyMatch(p -> p.getSessionId().equals(sessionId))) {
                return room;
            }
        }
        return null;
    }
    
    // Remove player from room
    public boolean removePlayerFromRoom(String roomId, String sessionId) {
        GameRoom room = rooms.get(roomId);
        if (room != null) {
            Player toRemove = room.getPlayerBySessionId(sessionId);
            if (toRemove != null) {
                room.getPlayers().remove(toRemove);
                System.out.println(">>> Player " + toRemove.getUsername() + " removed from room " + roomId);
                return true;
            }
        }
        return false;
    }
    
    // Handle drawer disconnect during game
    public void handleDrawerDisconnect(GameRoom room) {
        if (room == null || !room.isGameRunning()) return;
        
        // If no players left, game will be cleaned up by caller
        if (room.getPlayers().isEmpty()) {
            room.setGameRunning(false);
            return;
        }
        
        // If only 1 player left, end the game
        if (room.getPlayers().size() == 1) {
            System.out.println(">>> Only 1 player left. Ending game.");
            endGame(room);
            return;
        }
        
        // Otherwise, skip to next turn
        System.out.println(">>> Drawer disconnected. Skipping to next turn...");
        startNewRound(room);
    }
    
    // Remove a specific room
    public void removeRoom(String roomId) {
        rooms.remove(roomId);
        System.out.println(">>> Room " + roomId + " removed from memory");
    }
    
    // Clean up inactive public rooms (private rooms are kept longer)
    public int cleanupInactiveRooms(long publicInactiveMs, long privateInactiveMs) {
        List<String> roomsToRemove = new ArrayList<>();
        
        for (GameRoom room : rooms.values()) {
            long threshold = room.isPrivate() ? privateInactiveMs : publicInactiveMs;
            
            // Remove if:
            // 1. Room is inactive for too long
            // 2. Room has no players
            // 3. Game is not running (don't interrupt active games)
            if ((room.isInactive(threshold) || room.getPlayers().isEmpty()) && !room.isGameRunning()) {
                roomsToRemove.add(room.getRoomId());
            }
        }
        
        for (String roomId : roomsToRemove) {
            removeRoom(roomId);
        }
        
        return roomsToRemove.size();
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
        
        // Use configured drawing time from room settings
        room.setRoundTime(room.getDrawingTime());

        // Pick new Word - Priority: Custom words > Language-specific wordlist > Default
        String word;
        if (room.getCustomWords() != null && !room.getCustomWords().isEmpty()) {
            word = room.getCustomWords().get(new Random().nextInt(room.getCustomWords().size()));
            System.out.println(">>> Using CUSTOM word");
        } else {
            List<String> wordList = getWordListForLanguage(room.getLanguage());
            word = wordList.get(new Random().nextInt(wordList.size()));
            System.out.println(">>> Using word from language: " + room.getLanguage());
        }
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
            int timeElapsed = room.getDrawingTime() - room.getRoundTime();
            int points = calculatePoints(timeElapsed, room.getPlayersWhoGuessedCorrectly().size(), room.getScoringMode(), room.getDrawingTime());
            
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
    // Adjusted by scoring mode: Chill (50%), Normal (100%), Competitive (150%)
    private int calculatePoints(int timeElapsed, int guessPosition, String scoringMode, int maxTime) {
        int basePoints = 50;
        int timeBonus = Math.max(0, (maxTime - timeElapsed) * 2); // Proportional to max time
        int positionBonus = guessPosition == 1 ? 50 : (guessPosition == 2 ? 25 : 0); // Bonus for being first/second
        
        int totalPoints = basePoints + timeBonus + positionBonus;
        
        // Apply scoring mode multiplier
        double multiplier = 1.0;
        if ("Chill".equals(scoringMode)) {
            multiplier = 0.5; // Casual play, lower stakes
        } else if ("Competitive".equals(scoringMode)) {
            multiplier = 1.5; // High stakes, more points
        }
        // Normal mode uses 1.0 multiplier (no change)
        
        return (int) (totalPoints * multiplier);
    }
}