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
    
    private final List<String> defaultWordList = Arrays.asList("apple", "banana", "house", "car", "tree", "dog", "cat", "computer", "java", "spring");
    
    public GameService() {
        List<String> englishWords = new ArrayList<>();
        englishWords.addAll(loadWordsFromFile("en_us.txt"));
        englishWords.addAll(loadWordsFromFile("en_gb.txt"));
        wordListsByLanguage.put("English", englishWords);
        wordListsByLanguage.put("German", loadWordsFromFile("de.txt"));
        wordListsByLanguage.put("French", loadWordsFromFile("fr.txt"));
        wordListsByLanguage.put("Italian", loadWordsFromFile("it.txt"));
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
            return words;
        } catch (IOException | NullPointerException e) {
            return new ArrayList<>(defaultWordList);
        }
    }
    
    private List<String> getWordListForLanguage(String language) {
        List<String> words = wordListsByLanguage.get(language);
        if (words == null || words.isEmpty()) {
            return defaultWordList;
        }
        return words;
    }

    public GameRoom createRoom(String roomId, String playerName, String sessionId, GameRoomConfig config) {
        GameRoom room = new GameRoom();
        room.setRoomId(roomId);
        
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
    
    public GameRoom createRoom(String roomId, String playerName, String sessionId, GameRoomConfig config, String ipAddress) {
        GameRoom room = createRoom(roomId, playerName, sessionId, config);
        if (room != null && ipAddress != null) {
            Player host = room.getPlayers().get(0);
            if (host != null) {
                host.setIpAddress(ipAddress);
            }
        }
        return room;
    }
    
    public GameRoom createRoom(String roomId, String playerName, String sessionId) {
        return createRoom(roomId, playerName, sessionId, null);
    }

    public GameRoom joinRoom(String roomId, String playerName, String sessionId, String ipAddress) {
        GameRoom room = rooms.get(roomId);
        if (room != null) {
            if (room.isGameOver()) {
                return null;
            }
            
            if (room.getPlayers().size() >= room.getMaxPlayers()) {
                return null;
            }
            
            boolean playerExists = room.getPlayers().stream()
                    .anyMatch(p -> p.getSessionId().equals(sessionId));
            if (!playerExists) {
                Player newPlayer = new Player(sessionId, playerName, 0);
                newPlayer.setIpAddress(ipAddress);
                room.addPlayer(newPlayer);
            }
            room.updateActivity();
            return room;
        }
        return null;
    }
    
    public GameRoom joinRoom(String roomId, String playerName, String sessionId) {
        return joinRoom(roomId, playerName, sessionId, null);
    }

    public GameRoom getRoom(String roomId) {
        return rooms.get(roomId);
    }

    public Collection<GameRoom> getAllPublicRooms() {
        return rooms.values().stream()
                .filter(room -> !room.isPrivate() && !room.isGameRunning() && !room.isGameOver() && !room.getPlayers().isEmpty())
                .toList();
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
                return true;
            }
        }
        return false;
    }
    
    // Handle drawer disconnect during game
    public void handleDrawerDisconnect(GameRoom room) {
        if (room == null || !room.isGameRunning()) return;
        
        if (room.getPlayers().isEmpty()) {
            room.setGameRunning(false);
            return;
        }
        
        if (room.getPlayers().size() == 1) {
            endGame(room);
            return;
        }
        
        startNewRound(room);
    }
    
    public void removeRoom(String roomId) {
        rooms.remove(roomId);
    }
    
    public int cleanupInactiveRooms(long publicInactiveMs, long privateInactiveMs) {
        List<String> roomsToRemove = new ArrayList<>();
        
        for (GameRoom room : rooms.values()) {
            long threshold = room.isPrivate() ? privateInactiveMs : publicInactiveMs;
            
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

        room.setDrawerIndex(room.getDrawerIndex() + 1);

        // Handle case where drawerIndex is out of bounds (e.g. player left or joined)
        if (room.getDrawerIndex() >= players.size()) {
            room.setDrawerIndex(0);
            room.setCurrentRound(room.getCurrentRound() + 1);
        }
        
        // Double check index validity after reset
        if (room.getDrawerIndex() >= players.size()) {
             room.setDrawerIndex(0);
        }

        if (room.isGameOver()) {
            endGame(room);
            return;
        }

        room.resetRoundData();
        room.setGameRunning(true);
        room.setRoundTime(15); // 15 seconds to choose a word

        int numChoices = room.getCustomWordsPerTurn();
        List<String> choices = new ArrayList<>();
        
        if (room.getCustomWords() != null && !room.getCustomWords().isEmpty()) {
            List<String> customList = new ArrayList<>(room.getCustomWords());
            Random rand = new Random();
            for (int i = 0; i < Math.min(numChoices, customList.size()); i++) {
                int idx = rand.nextInt(customList.size());
                choices.add(customList.remove(idx));
            }
        } else {
            List<String> wordList = getWordListForLanguage(room.getLanguage());
            Random rand = new Random();
            for (int i = 0; i < numChoices; i++) {
                choices.add(wordList.get(rand.nextInt(wordList.size())));
            }
        }
        
        room.setWordChoices(choices);
        room.setWordChosen(false);
        room.setCurrentWord(null);

        calculateHintTimes(room);

        Player drawer = players.get(room.getDrawerIndex());
        room.setCurrentDrawerSessionId(drawer.getSessionId());
    }
    
    public void endGame(GameRoom room) {
        room.setGameRunning(false);
        room.setCurrentWord("GAME OVER");
        room.setCurrentDrawerSessionId(null);
    }

    public boolean processGuess(String roomId, String guess, String senderSessionId) {
        GameRoom room = rooms.get(roomId);
        if (room == null || !room.isGameRunning()) return false;
        
        // Ensure player is actually in the room (prevents ghost players)
        if (room.getPlayerBySessionId(senderSessionId) == null) return false;
        
        if (senderSessionId.equals(room.getCurrentDrawerSessionId())) return false; // Drawer cannot guess
        if (room.getPlayersWhoGuessedCorrectly().contains(senderSessionId)) return false; // Already guessed

        boolean isCorrect = room.getCurrentWord() != null && room.getCurrentWord().equalsIgnoreCase(guess.trim());
        
        if (isCorrect) {
            room.getPlayersWhoGuessedCorrectly().add(senderSessionId);
            
            int timeElapsed = room.getDrawingTime() - room.getRoundTime();
            int points = calculatePoints(timeElapsed, room.getPlayersWhoGuessedCorrectly().size(), room.getScoringMode(), room.getDrawingTime());
            
            Player guesser = room.getPlayerBySessionId(senderSessionId);
            if (guesser != null) {
                guesser.setScore(guesser.getScore() + points);
            }
            
            Player drawer = room.getPlayerBySessionId(room.getCurrentDrawerSessionId());
            if (drawer != null) {
                drawer.setScore(drawer.getScore() + 10);
            }
        }
        
        return isCorrect;
    }
    
    private void calculateHintTimes(GameRoom room) {
        int drawTime = room.getDrawingTime();
        List<Integer> hintTimes = new ArrayList<>();
        
        int numHints = Math.max(2, Math.min(5, drawTime / 30));
        int startBuffer = 15;
        int availableTime = drawTime - startBuffer;
        int interval = availableTime / (numHints + 1);
        
        for (int i = 1; i <= numHints; i++) {
            int hintTime = drawTime - (startBuffer + (interval * i));
            if (hintTime > 0) {
                hintTimes.add(hintTime);
            }
        }
        
        hintTimes.sort((a, b) -> Integer.compare(b, a));
        room.setHintTimes(hintTimes);
    }
    
    public boolean chooseWord(String roomId, String sessionId, String chosenWord) {
        GameRoom room = rooms.get(roomId);
        if (room == null || !room.isGameRunning()) return false;
        if (!sessionId.equals(room.getCurrentDrawerSessionId())) return false;
        if (room.isWordChosen()) return false;
        if (!room.getWordChoices().contains(chosenWord)) return false;
        
        room.setCurrentWord(chosenWord);
        room.setWordChosen(true);
        room.setRoundTime(room.getDrawingTime()); // Start the drawing timer
        room.getWordChoices().clear();
        
        return true;
    }
    
    private int calculatePoints(int timeElapsed, int guessPosition, String scoringMode, int maxTime) {
        int basePoints = 50;
        int timeBonus = Math.max(0, (maxTime - timeElapsed) * 2);
        int positionBonus = guessPosition == 1 ? 50 : (guessPosition == 2 ? 25 : 0);
        
        int totalPoints = basePoints + timeBonus + positionBonus;
        
        double multiplier = 1.0;
        if ("Chill".equals(scoringMode)) {
            multiplier = 0.5;
        } else if ("Competitive".equals(scoringMode)) {
            multiplier = 1.5;
        }
        return (int) (totalPoints * multiplier);
    }
}