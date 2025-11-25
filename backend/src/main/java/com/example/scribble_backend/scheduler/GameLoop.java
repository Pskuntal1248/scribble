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

    // Clean up inactive rooms every 5 minutes
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void cleanupInactiveRooms() {
        // Public rooms: inactive for 15 minutes
        // Private rooms: inactive for 60 minutes (1 hour)
        long publicThreshold = 15 * 60 * 1000;  // 15 minutes
        long privateThreshold = 60 * 60 * 1000; // 60 minutes
        
        int removed = gameService.cleanupInactiveRooms(publicThreshold, privateThreshold);
        if (removed > 0) {
            System.out.println(">>> Cleaned up " + removed + " inactive room(s)");
        }
    }
    
    @Scheduled(fixedRate = 1000)
    public void gameTick() {
        for (GameRoom room : gameService.getAllRooms()) {
            if (room.isGameRunning() && room.getRoundTime() > 0) {
                
               
                room.setRoundTime(room.getRoundTime() - 1);

             
                if (room.getRoundTime() == 45 || room.getRoundTime() == 30 || room.getRoundTime() == 15) {
                    revealRandomLetter(room);
                    
                    String hintWord = room.getHintWord();
                    System.out.println(">>> HINT REVEALED at " + room.getRoundTime() + "s: " + hintWord);
                    
                  
                    messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/state", room);
                }

               
                messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/time", room.getRoundTime());

              
                if (room.allPlayersGuessed()) {
                    System.out.println(">>> All players guessed! Ending round early.");
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

        // If there are unrevealed positions, reveal one randomly
        if (!unrevealedPositions.isEmpty()) {
            Random rand = new Random();
            int randomIndex = unrevealedPositions.get(rand.nextInt(unrevealedPositions.size()));
            room.getRevealedIndices().add(randomIndex);
            System.out.println(">>> Letter revealed at position " + randomIndex + ": '" + word.charAt(randomIndex) + "'");
        } else {
            System.out.println(">>> All letters already revealed!");
        }
    }
    
    private void endRoundAndStartNext(GameRoom room) {
        String oldWord = room.getCurrentWord();
        
        // Send clear canvas message BEFORE starting next round
        com.example.scribble_backend.model.DrawMessage clearMsg = new com.example.scribble_backend.model.DrawMessage();
        clearMsg.setType("CLEAR");
        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/draw", clearMsg);
        
        // Show what the word was (without scores - they're in the scoreboard)
        ChatMessage wordRevealMsg = ChatMessage.builder()
                .type(ChatMessage.MessageType.SYSTEM)
                .sender("System")
                .content("The word was: " + oldWord)
                .build();
        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/chat", wordRevealMsg);
        
        // Small delay to let players see the word reveal
        try { Thread.sleep(500); } catch (InterruptedException e) { }
        
        // Start new round (or end game)
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