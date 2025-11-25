package com.example.scribble_backend.model;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import lombok.Data;

@Data
public class GameRoom {
    private String roomId;
    private List<Player> players = new ArrayList<>();
    
    // Lobby configuration
    private String language = "English (US)";
    private String scoringMode = "Chill"; // Chill, Normal, Competitive
    private int drawingTime = 120; // seconds
    private int maxPlayers = 24;
    private int playersPerIpLimit = 2;
    private int customWordsPerTurn = 3;
    private List<String> customWords = new ArrayList<>();
    private boolean isPrivate = false;
    private String lobbyName = "";
    
    // Game state
    private String currentWord;
    private String currentDrawerSessionId;
    private int roundTime = 60;
    private boolean gameRunning = false;
    
    // ROTATION LOGIC - Proper turn-based system
    private int currentRound = 1;
    private int maxRounds = 2;  // 2 rounds for 10+ players, 3 for fewer players
    private int drawerIndex = -1; // Tracks whose turn it is (-1 = not started)
    
    // Scoring tracking
    private Set<String> playersWhoGuessedCorrectly = new HashSet<>();
    private long roundStartTime = 0;
    
    // Drawing
    private List<DrawMessage> drawHistory = new ArrayList<>();
    private Set<Integer> revealedIndices = new HashSet<>();
    private Set<String> skipVotes = new HashSet<>();
    
    // Activity tracking for auto-cleanup
    private long lastActivityTime = System.currentTimeMillis();

    public void addPlayer(Player player) {
        this.players.add(player);
    }
    
    public void addStroke(DrawMessage stroke) {
        this.drawHistory.add(stroke);
    }
    
    public void clearHistory() {
        this.drawHistory.clear();
    }
    
    // CRITICAL: This method is called automatically by Jackson when serializing to JSON
    // It provides the hint word with revealed letters for guessers
    public String getHintWord() {
        if (currentWord == null || currentWord.isEmpty()) {
            return "_ _ _ _ _";
        }
        
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < currentWord.length(); i++) {
            char c = currentWord.charAt(i);
            
            // Show letter if: it's revealed, OR it's a space/hyphen
            if (revealedIndices.contains(i) || c == ' ' || c == '-') {
                sb.append(c);
            } else {
                sb.append("_");
            }
            
            // Add space between characters for readability
            if (i < currentWord.length() - 1) {
                sb.append(" ");
            }
        }
        
        return sb.toString().trim();
    }
    
    // Lombok @Data will generate isGameRunning() getter automatically
    public boolean isGameRunning() {
        return gameRunning;
    }
    
    public void setGameRunning(boolean gameRunning) {
        this.gameRunning = gameRunning;
    }
    
    // Get player by session ID
    public Player getPlayerBySessionId(String sessionId) {
        return players.stream()
                .filter(p -> p.getSessionId().equals(sessionId))
                .findFirst()
                .orElse(null);
    }
    
    // Check if all players have guessed
    public boolean allPlayersGuessed() {
        int nonDrawerPlayers = players.size() - 1; // Exclude drawer
        return playersWhoGuessedCorrectly.size() >= nonDrawerPlayers && nonDrawerPlayers > 0;
    }
    
    // Check if game should end (after all rounds complete)
    public boolean isGameOver() {
        return currentRound > maxRounds;
    }
    
    // Adjust max rounds based on player count
    public void adjustMaxRounds() {
        if (players.size() >= 8) {
            maxRounds = 2; // Keep it short for many players
        } else if (players.size() >= 4) {
            maxRounds = 3; // Standard for medium groups
        } else {
            maxRounds = 3; // More rounds for small groups
        }
    }
    
    // Reset round-specific data
    public void resetRoundData() {
        playersWhoGuessedCorrectly.clear();
        revealedIndices.clear();
        skipVotes.clear();
        drawHistory.clear();
        roundStartTime = System.currentTimeMillis();
    }
    
    // Update activity timestamp
    public void updateActivity() {
        this.lastActivityTime = System.currentTimeMillis();
    }
    
    // Check if room is inactive (no activity for X minutes)
    public boolean isInactive(long inactiveThresholdMs) {
        return (System.currentTimeMillis() - lastActivityTime) > inactiveThresholdMs;
    }
}