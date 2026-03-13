package com.sheild.controller;

import com.google.cloud.firestore.Firestore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    @Autowired private Firestore firestore;

    private String getUid() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public ResponseEntity<?> getSettings() throws Exception {
        try {
            String uid = getUid();
            var doc = firestore.collection("users").document(uid).get().get();
            if (doc.exists() && doc.contains("settings")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> settings = new HashMap<>((Map<String, Object>) doc.get("settings"));
                // Ensure emergencyNumber always has a default
                Object emergencyNum = settings.get("emergencyNumber");
                if (emergencyNum == null || emergencyNum.toString().isBlank()) {
                    settings.put("emergencyNumber", "100");
                }
                if (!settings.containsKey("autoCallPolice")) {
                    settings.put("autoCallPolice", true);
                }
                if (!settings.containsKey("holdCountdown")) {
                    settings.put("holdCountdown", 3);
                }
                return ResponseEntity.ok(settings);
            }
            // Return defaults when no settings exist
            Map<String, Object> defaults = new HashMap<>();
            defaults.put("emergencyNumber", "100");
            defaults.put("autoCallPolice", true);
            defaults.put("holdCountdown", 3);
            return ResponseEntity.ok(defaults);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }

    @PutMapping
    public ResponseEntity<?> updateSettings(@RequestBody Map<String, Object> body) throws Exception {
        try {
            String uid = getUid();
            // Never store null or empty emergencyNumber — fallback to "100"
            Object emergencyNum = body.get("emergencyNumber");
            if (emergencyNum == null || emergencyNum.toString().isBlank()) {
                body.put("emergencyNumber", "100");
            }
            firestore.collection("users").document(uid).update("settings", body).get();
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }

    @PostMapping("/fcm-token")
    public ResponseEntity<?> updateFcmToken(@RequestBody Map<String, String> body) throws Exception {
        String uid = getUid();
        String token = body.get("token");
        try {
            if (token != null) {
                firestore.collection("users").document(uid).update("fcmToken", token).get();
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }
}
