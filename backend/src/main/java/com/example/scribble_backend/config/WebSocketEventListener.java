package com.example.scribble_backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.example.scribble_backend.model.ChatMessage;
import com.example.scribble_backend.model.GameRoom;
import com.example.scribble_backend.model.Player;
import com.example.scribble_backend.service.GameService;

@Component
public class WebSocketEventListener {

    @Autowired
    private GameService gameService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        if (sessionId != null) {
            System.out.println(">>> WebSocket DISCONNECT: sessionId=" + sessionId);
            
            // Find the room and player
            GameRoom room = gameService.findRoomBySessionId(sessionId);
            if (room != null) {
                Player disconnectedPlayer = room.getPlayerBySessionId(sessionId);
                String playerName = disconnectedPlayer != null ? disconnectedPlayer.getUsername() : "Unknown";
                
                System.out.println(">>> Player '" + playerName + "' disconnected from room " + room.getRoomId());
                
                // Remove player from room
                boolean removed = gameService.removePlayerFromRoom(room.getRoomId(), sessionId);
                
                if (removed) {
                    // Check if room is now empty
                    if (room.getPlayers().isEmpty()) {
                        System.out.println(">>> Room " + room.getRoomId() + " is now EMPTY. Removing from server.");
                        gameService.removeRoom(room.getRoomId());
                    } else {
                        System.out.println(">>> Room " + room.getRoomId() + " now has " + room.getPlayers().size() + " player(s)");
                        
                        // Notify other players
                        ChatMessage leaveMsg = ChatMessage.builder()
                                .type(ChatMessage.MessageType.SYSTEM)
                                .sender("System")
                                .content(playerName + " left the game")
                                .build();
                        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/chat", leaveMsg);
                        
                        // Broadcast updated state
                        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/state", room);
                        
                        // If game was running and drawer left, end the round
                        if (room.isGameRunning() && sessionId.equals(room.getCurrentDrawerSessionId())) {
                            System.out.println(">>> Drawer left during game! Ending current turn...");
                            gameService.handleDrawerDisconnect(room);
                            
                            // Broadcast new game state
                            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/state", room);
                        }
                    }
                }
            }
        }
    }
}
