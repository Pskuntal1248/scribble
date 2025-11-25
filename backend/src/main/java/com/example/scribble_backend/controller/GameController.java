package com.example.scribble_backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import com.example.scribble_backend.model.ChatMessage;
import com.example.scribble_backend.model.DrawMessage;
import com.example.scribble_backend.model.GameRoom;
import com.example.scribble_backend.model.GameRoomConfig;
import com.example.scribble_backend.service.GameService;

@Controller
public class GameController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private GameService gameService;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @MessageMapping("/join")
    @SuppressWarnings("unchecked")
    public void joinRoom(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {
        String username = (String) payload.get("username");
        String roomIdRequested = (String) payload.get("roomId");
        String action = (String) payload.get("action");
        String sessionId = headerAccessor.getSessionId(); // THIS IS THE KEY ID
        
        // Extract IP address from session attributes (set by WebSocket handshake interceptor)
        String ipAddress = null;
        if (headerAccessor.getSessionAttributes() != null) {
            ipAddress = (String) headerAccessor.getSessionAttributes().get("IP_ADDRESS");
        }

        System.out.println(">>> REQUEST: " + username + " (" + sessionId + ") from IP " + ipAddress + " wants to " + action + " room " + roomIdRequested);

        GameRoom room;
        if ("create".equals(action)) {
            // Parse config from payload
            Map<String, Object> configMap = (Map<String, Object>) payload.get("config");
            GameRoomConfig config = null;
            
            if (configMap != null) {
                config = new GameRoomConfig();
                config.setLanguage((String) configMap.get("language"));
                config.setScoringMode((String) configMap.get("scoringMode"));
                config.setDrawingTime((Integer) configMap.get("drawingTime"));
                config.setRounds((Integer) configMap.get("rounds"));
                config.setMaxPlayers((Integer) configMap.get("maxPlayers"));
                config.setPlayersPerIpLimit((Integer) configMap.get("playersPerIpLimit"));
                config.setCustomWordsPerTurn((Integer) configMap.get("customWordsPerTurn"));
                config.setPrivate((Boolean) configMap.get("isPrivate"));
                config.setLobbyName((String) configMap.get("lobbyName"));
                
                // Parse custom words list
                Object customWordsObj = configMap.get("customWords");
                if (customWordsObj instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<String> customWordsList = (List<String>) customWordsObj;
                    config.setCustomWords(customWordsList);
                    System.out.println(">>> Custom words provided: " + customWordsList.size() + " words");
                }
                
                System.out.println(">>> Creating room with config: isPrivate=" + config.isPrivate() + 
                                   ", drawingTime=" + config.getDrawingTime() + 
                                   ", rounds=" + config.getRounds() + 
                                   ", maxPlayers=" + config.getMaxPlayers() +
                                   ", playersPerIP=" + config.getPlayersPerIpLimit() +
                                   ", scoringMode=" + config.getScoringMode());
            }
            
            room = gameService.createRoom(roomIdRequested, username, sessionId, config, ipAddress);
        } else {
            room = gameService.joinRoom(roomIdRequested, username, sessionId, ipAddress);
        }

        if (room != null) {
            System.out.println(">>> Player joined successfully. Room has " + room.getPlayers().size() + " players");
            
            // Send join message
            ChatMessage joinMsg = ChatMessage.builder()
                    .type(ChatMessage.MessageType.JOIN)
                    .content(username + " joined!")
                    .sender(username)
                    .senderSessionId(sessionId)
                    .build();
            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/chat", joinMsg);
            
            // Broadcast current state (critical for late joiners)
            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/state", room);
            System.out.println(">>> State sent: gameRunning=" + room.isGameRunning() + ", drawer=" + room.getCurrentDrawerSessionId());

            // Sync drawing history for late joiners
            if ("join".equals(action) && !room.getDrawHistory().isEmpty()) {
                System.out.println(">>> Syncing " + room.getDrawHistory().size() + " strokes to late joiner");
                for (DrawMessage stroke : room.getDrawHistory()) {
                    messagingTemplate.convertAndSendToUser(sessionId, "/queue/draw", stroke);
                }
            }
        } else {
            System.out.println(">>> ERROR: Room is null after join attempt!");
        }
    }

    // ... (Keep handleDraw, handleChat, and startGame exactly as they were) ...
    @MessageMapping("/draw/{roomId}")
    public void handleDraw(@DestinationVariable String roomId, @Payload DrawMessage message) {
        GameRoom room = gameService.getRoom(roomId);
        if (room != null) {
            room.updateActivity(); // Track activity
            if ("CLEAR".equals(message.getType())) room.clearHistory();
            else room.addStroke(message);
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/draw", message);
        }
    }

    @MessageMapping("/chat/{roomId}")
    public void handleChat(@DestinationVariable String roomId, @Payload ChatMessage message, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        GameRoom room = gameService.getRoom(roomId);
        if (room != null) room.updateActivity(); // Track activity
        
        boolean isCorrect = gameService.processGuess(roomId, message.getContent(), sessionId);
        
        if (isCorrect) {
            room = gameService.getRoom(roomId);
            
            // Send green message showing who guessed correctly
            ChatMessage successMsg = ChatMessage.builder()
                    .type(ChatMessage.MessageType.GUESS_CORRECT)
                    .sender("System")
                    .content(message.getSender() + " guessed it right!")
                    .build();
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/chat", successMsg);
            
            // Broadcast updated state (for scores)
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/state", room);
        } else {
            // Send wrong guesses to chat so everyone can see
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/chat", message);
        }
    }

    @MessageMapping("/start/{roomId}")
    public synchronized void startGame(@DestinationVariable String roomId) {
        GameRoom room = gameService.getRoom(roomId);
        if(room != null) {
            // Prevent multiple starts - check if game is already running
            if (room.isGameRunning()) {
                System.out.println(">>> Game already running in room: " + roomId);
                return;
            }
            
            room.updateActivity(); // Track activity
            System.out.println(">>> START GAME REQUEST for room: " + roomId);
            
            // Start new round
            gameService.startNewRound(room);
            
            // Broadcast state to all players
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/state", room);
            
            // Send game started message
            ChatMessage startMsg = ChatMessage.builder()
                    .type(ChatMessage.MessageType.SYSTEM)
                    .sender("System")
                    .content("Game Started! Draw and Guess!")
                    .build();
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/chat", startMsg);
            
            System.out.println(">>> Game state broadcasted. gameRunning=" + room.isGameRunning() + ", hint=" + room.getHintWord());
        }
    }
    
    // REST endpoint to get current room state (fallback for WebSocket issues)
    @CrossOrigin(origins = "${app.cors.allowed-origins}")
    @GetMapping("/api/room/{roomId}/state")
    @ResponseBody
    public GameRoom getRoomState(@PathVariable String roomId) {
        System.out.println(">>> REST API: Getting state for room " + roomId);
        return gameService.getRoom(roomId);
    }
}