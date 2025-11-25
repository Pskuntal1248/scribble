package com.example.scribble_backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Player {
    private String sessionId;
    private String username;
    private int score;
    private String ipAddress;
    
    public Player(String sessionId, String username, int score) {
        this.sessionId = sessionId;
        this.username = username;
        this.score = score;
        this.ipAddress = null;
    }
}