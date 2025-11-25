package com.example.scribble_backend.model;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;

@Data
public class GameRoomConfig {
    private String language = "English (US)";
    private String scoringMode = "Chill"; // Chill, Normal, Competitive
    private int drawingTime = 120; // seconds
    private int rounds = 4;
    private int maxPlayers = 24;
    private int playersPerIpLimit = 2;
    private int customWordsPerTurn = 3;
    private List<String> customWords = new ArrayList<>();
    private boolean isPrivate = false;
    private String lobbyName = "";
}
