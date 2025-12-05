package com.example.scribble_backend.model;

import lombok.Data;

@Data
public class DrawMessage {
    private String type; 
    private double prevX;
    private double prevY;
    private double currX;
    private double currY;
    private String color;
    private int lineWidth;
    
}