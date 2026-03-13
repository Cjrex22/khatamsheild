package com.sheild.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.google.firebase.auth.FirebaseAuthException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(FirebaseAuthException.class)
    public ResponseEntity<?> handleFirebaseAuthException(FirebaseAuthException e) {
        Map<String, String> body = new HashMap<>();
        body.put("error", "Authentication failed: " + e.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public Object handleNoResourceFoundException(org.springframework.web.servlet.resource.NoResourceFoundException e, jakarta.servlet.http.HttpServletRequest request) {
        if (!request.getRequestURI().startsWith("/api/")) {
            org.springframework.core.io.Resource resource = new org.springframework.core.io.ClassPathResource("/static/index.html");
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.TEXT_HTML)
                    .body(resource);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(Exception e) {
        e.printStackTrace();
        Map<String, String> body = new HashMap<>();
        body.put("error", e.getMessage() != null ? e.getMessage() : "Internal server error");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
