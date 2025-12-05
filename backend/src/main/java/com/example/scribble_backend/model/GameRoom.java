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
    
    private String language = "English";
    private String scoringMode = "Chill";
    private int drawingTime = 120;
    private int maxPlayers = 24;
    private int playersPerIpLimit = 2;
    private int customWordsPerTurn = 3;
    private List<String> customWords = new ArrayList<>();
    private boolean isPrivate = false;
    private String lobbyName = "";
    
    private List<String> wordChoices = new ArrayList<>();
    private boolean wordChosen = false;
    
    private String currentWord;
    private String currentDrawerSessionId;
    private int roundTime = 60;
    private boolean gameRunning = false;
    
    private List<Integer> hintTimes = new ArrayList<>();
    private int hintsRevealed = 0;
    
    private int currentRound = 1;
    private int maxRounds = 3;
    private int drawerIndex = -1;
    
    private Set<String> playersWhoGuessedCorrectly = new HashSet<>();
    private long roundStartTime = 0;
    
    private List<DrawMessage> drawHistory = new ArrayList<>();
    private Set<Integer> revealedIndices = new HashSet<>();
    private Set<String> skipVotes = new HashSet<>();
    
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
    
    public String getHintWord() {
        if (currentWord == null || currentWord.isEmpty()) {
            return "_ _ _ _ _";
        }
        
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < currentWord.length(); i++) {
            char c = currentWord.charAt(i);
            
            if (revealedIndices.contains(i) || c == ' ' || c == '-') {
                sb.append(c);
            } else {
                sb.append("_");
            }
            
            if (i < currentWord.length() - 1) {
                sb.append(" ");
            }
        }
        
        return sb.toString().trim();
    }
    
    public boolean isGameRunning() {
        return gameRunning;
    }
    
    public void setGameRunning(boolean gameRunning) {
        this.gameRunning = gameRunning;
    }
    
    public Player getPlayerBySessionId(String sessionId) {
        return players.stream()
                .filter(p -> p.getSessionId().equals(sessionId))
                .findFirst()
                .orElse(null);
    }
    
    public boolean allPlayersGuessed() {
        int nonDrawerPlayers = players.size() - 1;
        return playersWhoGuessedCorrectly.size() >= nonDrawerPlayers && nonDrawerPlayers > 0;
    }
    
    public boolean isGameOver() {
        return currentRound > maxRounds;
    }
    
    public void resetRoundData() {
        playersWhoGuessedCorrectly.clear();
        revealedIndices.clear();
        skipVotes.clear();
        drawHistory.clear();
        hintsRevealed = 0;
        hintTimes.clear();
        roundStartTime = System.currentTimeMillis();
    }
    
    public void updateActivity() {
        this.lastActivityTime = System.currentTimeMillis();
    }
    
    public boolean isInactive(long inactiveThresholdMs) {
        return (System.currentTimeMillis() - lastActivityTime) > inactiveThresholdMs;
    }
}