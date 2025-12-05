package com.example.scribble_backend.scheduler;

import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.example.scribble_backend.model.ChatMessage;
import com.example.scribble_backend.model.GameRoom;
import com.example.scribble_backend.service.GameService;

@Component
@EnableScheduling
public class GameLoop {

    @Autowired
    private GameService gameService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    
    @Scheduled(fixedRate = 300000) 
    public void cleanupInactiveRooms() {
        long publicThreshold = 15 * 60 * 1000;  // 15 minutes
        long privateThreshold = 60 * 60 * 1000; // 60 minutes
        
        gameService.cleanupInactiveRooms(publicThreshold, privateThreshold);
    }
    
    @Scheduled(fixedRate = 1000)
    public void gameTick() {
        for (GameRoom room : gameService.getAllRooms()) {
            if (room.isGameRunning() && room.getRoundTime() > 0) {
                
               
                room.setRoundTime(room.getRoundTime() - 1);

                // Dynamic hint system - check if current time matches any hint time
                if (room.getHintTimes() != null && !room.getHintTimes().isEmpty()) {
                    int currentTime = room.getRoundTime();
                    
                    // Check if we should reveal a hint at this time
                    if (room.getHintTimes().contains(currentTime) && room.getHintsRevealed() < room.getHintTimes().size()) {
                        revealRandomLetter(room);
                        room.setHintsRevealed(room.getHintsRevealed() + 1);
                        
                        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/state", room);
                    }
                }

                messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/time", room.getRoundTime());

                if (room.allPlayersGuessed()) {
                    endRoundAndStartNext(room);
                }
                
        
                if (room.getRoundTime() == 0) {
                    String oldWord = room.getCurrentWord();
               
                    ChatMessage timeUpMsg = ChatMessage.builder()
                            .type(ChatMessage.MessageType.SYSTEM)
                            .sender("System")
                            .content("Time's up! Word was: " + oldWord)
                            .build();
                    messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/chat", timeUpMsg);
                    
                    endRoundAndStartNext(room);
                }
            }
        }
    }

    private void revealRandomLetter(GameRoom room) {
        String word = room.getCurrentWord();
        if (word == null || word.isEmpty()) return;


        java.util.List<Integer> unrevealedPositions = new java.util.ArrayList<>();
        for (int i = 0; i < word.length(); i++) {
            char c = word.charAt(i);
            if (!room.getRevealedIndices().contains(i) && c != ' ' && c != '-') {
                unrevealedPositions.add(i);
            }
        }

        if (!unrevealedPositions.isEmpty()) {
            Random rand = new Random();
            int randomIndex = unrevealedPositions.get(rand.nextInt(unrevealedPositions.size()));
            room.getRevealedIndices().add(randomIndex);
        }
    }
    
    private void endRoundAndStartNext(GameRoom room) {
        String oldWord = room.getCurrentWord();
        
     
        com.example.scribble_backend.model.DrawMessage clearMsg = new com.example.scribble_backend.model.DrawMessage();
        clearMsg.setType("CLEAR");
        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/draw", clearMsg);
        
    
        ChatMessage wordRevealMsg = ChatMessage.builder()
                .type(ChatMessage.MessageType.SYSTEM)
                .sender("System")
                .content("The word was: " + oldWord)
                .build();
        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/chat", wordRevealMsg);
        
    
        try { Thread.sleep(500); } catch (InterruptedException e) { }
        
     
        gameService.startNewRound(room);
        
       
        if (!room.isGameRunning()) {
            ChatMessage gameOverMsg = ChatMessage.builder()
                    .type(ChatMessage.MessageType.SYSTEM)
                    .sender("System")
                    .content("🎉 GAME OVER! Winner: " + getWinner(room))
                    .build();
            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/chat", gameOverMsg);
        }
        
    
        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/state", room);
    }
    
    private String getScoreSummary(GameRoom room) {
        return room.getPlayers().stream()
                .map(p -> p.getUsername() + "(" + p.getScore() + ")")
                .reduce((a, b) -> a + ", " + b)
                .orElse("No scores");
    }
    
    private String getWinner(GameRoom room) {
        return room.getPlayers().stream()
                .max((p1, p2) -> Integer.compare(p1.getScore(), p2.getScore()))
                .map(p -> p.getUsername() + " with " + p.getScore() + " points!")
                .orElse("Nobody");
    }
}