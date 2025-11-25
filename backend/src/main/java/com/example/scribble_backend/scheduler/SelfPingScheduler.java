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

    @Scheduled(fixedRate = 600000) // every 10 minutes (600,000 milliseconds)
    public void selfPing() {
        try {
            URL url = new URL(appUrl + "/ping");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            
            int responseCode = conn.getResponseCode();
            conn.getInputStream().close();
            
            System.out.println(">>> Self-ping successful: " + responseCode + " from " + appUrl);
        } catch (Exception e) {
            System.out.println(">>> Self-ping failed: " + e.getMessage());
        }
    }
}
