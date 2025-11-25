package com.example.scribble_backend.controller;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.scribble_backend.model.GameRoom;
import com.example.scribble_backend.model.GameRoomConfig;
import com.example.scribble_backend.service.GameService;

@RestController
@RequestMapping("/api/lobby")
@CrossOrigin(origins = "*")
public class LobbyController {

    @Autowired
    private GameService gameService;

    @GetMapping("/list")
    public ResponseEntity<Collection<GameRoom>> getPublicLobbies() {
        Collection<GameRoom> publicRooms = gameService.getAllPublicRooms();
        return ResponseEntity.ok(publicRooms);
    }

    @PostMapping("/create")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> createLobby(@RequestBody Map<String, Object> request) {
        String roomId = (String) request.get("roomId");
        String username = (String) request.get("username");
        String sessionId = (String) request.get("sessionId");
        
        // Parse configuration
        GameRoomConfig config = new GameRoomConfig();
        if (request.containsKey("config")) {
            Map<String, Object> configMap = (Map<String, Object>) request.get("config");
            
            if (configMap.containsKey("language")) config.setLanguage((String) configMap.get("language"));
            if (configMap.containsKey("scoringMode")) config.setScoringMode((String) configMap.get("scoringMode"));
            if (configMap.containsKey("drawingTime")) config.setDrawingTime((Integer) configMap.get("drawingTime"));
            if (configMap.containsKey("rounds")) config.setRounds((Integer) configMap.get("rounds"));
            if (configMap.containsKey("maxPlayers")) config.setMaxPlayers((Integer) configMap.get("maxPlayers"));
            if (configMap.containsKey("playersPerIpLimit")) config.setPlayersPerIpLimit((Integer) configMap.get("playersPerIpLimit"));
            if (configMap.containsKey("customWordsPerTurn")) config.setCustomWordsPerTurn((Integer) configMap.get("customWordsPerTurn"));
            if (configMap.containsKey("customWords")) config.setCustomWords((List<String>) configMap.get("customWords"));
            if (configMap.containsKey("isPrivate")) config.setPrivate((Boolean) configMap.get("isPrivate"));
            if (configMap.containsKey("lobbyName")) config.setLobbyName((String) configMap.get("lobbyName"));
        }
        
        GameRoom room = gameService.createRoom(roomId, username, sessionId, config);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", room != null);
        response.put("roomId", room != null ? room.getRoomId() : null);
        response.put("room", room);
        
        return ResponseEntity.ok(response);
    }
}
