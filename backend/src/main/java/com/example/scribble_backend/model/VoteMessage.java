package com.example.scribble_backend.model;

import lombok.Data;

@Data
public class VoteMessage {
    private String type; // "SKIP", "KICK"
    private String roomId;
}
