package com.example.scribble_backend.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.example.scribble_backend.model.ChatMessage;
import com.example.scribble_backend.model.DrawMessage;
import com.example.scribble_backend.model.GameRoom;
import com.example.scribble_backend.service.GameService;

@Controller
public class GameController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private GameService gameService;

    @MessageMapping("/join")
    public void joinRoom(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {
        String username = (String) payload.get("username");
        String roomIdRequested = (String) payload.get("roomId");
        String action = (String) payload.get("action");
        String sessionId = headerAccessor.getSessionId(); // THIS IS THE KEY ID

        System.out.println(">>> REQUEST: " + username + " (" + sessionId + ") wants to " + action + " room " + roomIdRequested);

        GameRoom room = null;
        if ("create".equals(action)) {
            // Just create with default config for now
            // Frontend sends config as nested object which we'll ignore for simplicity
            room = gameService.createRoom(roomIdRequested, username, sessionId);
        } else {
            room = gameService.joinRoom(roomIdRequested, username, sessionId);
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
            if ("CLEAR".equals(message.getType())) room.clearHistory();
            else room.addStroke(message);
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/draw", message);
        }
    }

    @MessageMapping("/chat/{roomId}")
    public void handleChat(@DestinationVariable String roomId, @Payload ChatMessage message, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        boolean isCorrect = gameService.processGuess(roomId, message.getContent(), sessionId);
        
        if (isCorrect) {
            GameRoom room = gameService.getRoom(roomId);
            
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
}