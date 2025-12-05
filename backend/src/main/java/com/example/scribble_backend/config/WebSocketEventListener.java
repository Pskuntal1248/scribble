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
            GameRoom room = gameService.findRoomBySessionId(sessionId);
            if (room != null) {
                Player disconnectedPlayer = room.getPlayerBySessionId(sessionId);
                String playerName = disconnectedPlayer != null ? disconnectedPlayer.getUsername() : "Unknown";
                
                boolean removed = gameService.removePlayerFromRoom(room.getRoomId(), sessionId);
                
                if (removed) {
                    if (room.getPlayers().isEmpty()) {
                        gameService.removeRoom(room.getRoomId());
                    } else {
                        ChatMessage leaveMsg = ChatMessage.builder()
                                .type(ChatMessage.MessageType.SYSTEM)
                                .sender("System")
                                .content(playerName + " left the game")
                                .build();
                        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/chat", leaveMsg);
                        
                        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/state", room);
                        
                        if (room.isGameRunning() && sessionId.equals(room.getCurrentDrawerSessionId())) {
                            gameService.handleDrawerDisconnect(room);
                            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/state", room);
                        }
                    }
                }
            }
        }
    }
}
