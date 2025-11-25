package com.example.scribble_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class ScribbleBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(ScribbleBackendApplication.class, args);
	}

}
