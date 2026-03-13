package com.sheild.controller;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.Firestore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quick-dials")
public class QuickDialController {

    @Autowired private Firestore firestore;

    private String getUid() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getQuickDials() throws Exception {
        String uid = getUid();
        try {
            var snapshot = firestore.collection("users").document(uid).collection("quickDials")
                .orderBy("createdAt").get().get();
                
            List<Map<String, Object>> results = new ArrayList<>();
            for (var doc : snapshot.getDocuments()) {
                Map<String, Object> data = doc.getData();
                data.put("id", doc.getId());
                results.add(data);
            }
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }

    @PostMapping
    public ResponseEntity<?> createQuickDial(@RequestBody Map<String, Object> body) throws Exception {
        String uid = getUid();
        try {
            body.put("createdAt", Timestamp.now());
            var docRef = firestore.collection("users").document(uid).collection("quickDials").add(body).get();
            body.put("id", docRef.getId());
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteQuickDial(@PathVariable String id) throws Exception {
        String uid = getUid();
        try {
            firestore.collection("users").document(uid).collection("quickDials").document(id).delete().get();
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }
}
