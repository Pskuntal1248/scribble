package com.example.scribble_backend.model;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;

@Data
public class GameRoomConfig {
    private String language = "English"; // English, German, French, Italian
    private String scoringMode = "Chill"; // Chill, Normal, Competitive
    private int drawingTime = 120; // seconds (60-240)
    private int rounds = 3; // number of rounds (1-10)
    private int maxPlayers = 20; // max players (2-24)
    private int playersPerIpLimit = 2; // players per IP (1-4)
    private int customWordsPerTurn = 3; // word choices for drawer (1-5)
    private List<String> customWords = new ArrayList<>(); // custom word list
    private boolean isPrivate = false; // public or private lobby
    private String lobbyName = ""; // lobby name
}
