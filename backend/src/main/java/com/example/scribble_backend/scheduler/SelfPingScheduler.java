package com.example.scribble_backend.scheduler;

import java.net.HttpURLConnection;
import java.net.URL;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SelfPingScheduler {

    @Value("${app.self-ping.url:http://localhost:8080}")
    private String appUrl;

    // Ping every 5 minutes (300000ms) to prevent free tier sleep
    @Scheduled(fixedRate = 300000) 
    public void selfPing() {
        try {
            URL url = new URL(appUrl + "/ping");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000); // Increased timeout
            conn.setReadTimeout(10000);
            conn.setRequestProperty("User-Agent", "SelfPing/1.0");
            
            int responseCode = conn.getResponseCode();
            if (responseCode == 200) {
                System.out.println("[SelfPing] Server is alive");
            }
            conn.getInputStream().close();
        } catch (Exception e) {
            System.err.println("[SelfPing] Failed: " + e.getMessage());
        }
    }
    
    // Warmup ping 30 seconds after startup
    @Scheduled(initialDelay = 30000, fixedRate = Long.MAX_VALUE)
    public void warmupPing() {
        System.out.println("[SelfPing] Warmup ping executed");
        selfPing();
    }
}
