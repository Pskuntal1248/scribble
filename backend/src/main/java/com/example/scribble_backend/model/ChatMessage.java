package com.example.scribble_backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessage {
    private String content;
    private String sender;
    private String senderSessionId; // <--- ADD THIS FIELD
    private MessageType type; 
    
    public enum MessageType {
        CHAT, JOIN, LEAVE, SYSTEM, GUESS_CORRECT
    }
}