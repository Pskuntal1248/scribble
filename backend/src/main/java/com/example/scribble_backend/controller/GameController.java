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
                }
            }
            
            room = gameService.createRoom(roomIdRequested, username, sessionId, config, ipAddress);
        } else {
            room = gameService.joinRoom(roomIdRequested, username, sessionId, ipAddress);
        }

        if (room != null) {
            ChatMessage joinMsg = ChatMessage.builder()
                    .type(ChatMessage.MessageType.JOIN)
                    .content(username + " joined!")
                    .sender(username)
                    .senderSessionId(sessionId)
                    .build();
            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/chat", joinMsg);
            
            // Force a small delay to ensure client subscription before state update
            try { Thread.sleep(100); } catch (InterruptedException e) {}
            
            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/state", room);

            if ("join".equals(action) && !room.getDrawHistory().isEmpty()) {
                for (DrawMessage stroke : room.getDrawHistory()) {
                    messagingTemplate.convertAndSendToUser(sessionId, "/queue/draw", stroke);
                }
            }
        } else {
            // Send error if join failed (e.g. room full or IP limit)
            ChatMessage errorMsg = ChatMessage.builder()
                    .type(ChatMessage.MessageType.SYSTEM)
                    .sender("System")
                    .content("Cannot join: Room is full or IP limit reached.")
                    .build();
            messagingTemplate.convertAndSendToUser(sessionId, "/queue/errors", errorMsg);
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
        
        if (room != null) {
            room.updateActivity();
            
            // Ensure player is registered in the room
            if (room.getPlayerBySessionId(sessionId) == null) {
                return;
            }
        }
        
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
            if (room.isGameRunning()) {
                return;
            }
            
            if (room.getPlayers().size() < 2) {
                ChatMessage errorMsg = ChatMessage.builder()
                        .type(ChatMessage.MessageType.SYSTEM)
                        .sender("System")
                        .content("Cannot start game: Minimum 2 players required!")
                        .build();
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/chat", errorMsg);
                return;
            }
            
            room.updateActivity();
            gameService.startNewRound(room);
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/state", room);
            
            ChatMessage startMsg = ChatMessage.builder()
                    .type(ChatMessage.MessageType.SYSTEM)
                    .sender("System")
                    .content("Game Started! Drawer is choosing a word...")
                    .build();
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/chat", startMsg);
        }
    }
    
    @MessageMapping("/chooseWord/{roomId}")
    public synchronized void chooseWord(@DestinationVariable String roomId, @Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {
        String chosenWord = (String) payload.get("word");
        String sessionId = headerAccessor.getSessionId();
        
        GameRoom room = gameService.getRoom(roomId);
        if (room != null) {
            boolean success = gameService.chooseWord(roomId, sessionId, chosenWord);
            
            if (success) {
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/state", room);
                
                ChatMessage msg = ChatMessage.builder()
                        .type(ChatMessage.MessageType.SYSTEM)
                        .sender("System")
                        .content("Word chosen! Start drawing now!")
                        .build();
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/chat", msg);
            }
        }
    }
    
    @CrossOrigin(origins = "${app.cors.allowed-origins}")
    @GetMapping("/api/room/{roomId}/state")
    @ResponseBody
    public GameRoom getRoomState(@PathVariable String roomId) {
        return gameService.getRoom(roomId);
    }
}