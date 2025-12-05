package com.example.scribble_backend.config;

import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import jakarta.servlet.http.HttpServletRequest;

public class HttpHandshakeInterceptor implements HandshakeInterceptor {

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        
        if (request instanceof ServletServerHttpRequest) {
            ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
            HttpServletRequest httpRequest = servletRequest.getServletRequest();
            
            // Extract IP address
            String ipAddress = httpRequest.getHeader("X-Forwarded-For");
            if (ipAddress == null || ipAddress.isEmpty()) {
                ipAddress = httpRequest.getHeader("X-Real-IP");
            }
            if (ipAddress == null || ipAddress.isEmpty()) {
                ipAddress = httpRequest.getRemoteAddr();
            }
            
            // Store IP in session attributes
            attributes.put("IP_ADDRESS", ipAddress);
        }
        
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // Nothing to do after handshake
    }
}
