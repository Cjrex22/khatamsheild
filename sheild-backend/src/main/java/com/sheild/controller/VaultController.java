package com.sheild.controller;

import com.google.cloud.firestore.Firestore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vault")
public class VaultController {

    @Autowired
    private Firestore firestore;

    private String getUid() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping("/recordings")
    public ResponseEntity<List<Map<String, Object>>> getRecordings() throws Exception {
        String uid = getUid();
        List<Map<String, Object>> results = new ArrayList<>();

        try {
            var sosRecordings = firestore.collection("users").document(uid).collection("sosRecordings").get().get();
            for (var doc : sosRecordings.getDocuments()) {
                Map<String, Object> data = doc.getData();
                data.put("id", doc.getId());
                data.put("type", "sos");
                results.add(data);
            }

            var evidenceRecordings = firestore.collection("users").document(uid).collection("evidenceRecordings").get()
                    .get();
            for (var doc : evidenceRecordings.getDocuments()) {
                Map<String, Object> data = doc.getData();
                data.put("id", doc.getId());
                data.put("type", "evidence");
                results.add(data);
            }

            return ResponseEntity.ok(results);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }

    @DeleteMapping("/recordings/{id}")
    public ResponseEntity<?> deleteRecording(@PathVariable String id, @RequestParam String type) throws Exception {
        String uid = getUid();
        String collection = "sos".equals(type) ? "sosRecordings" : "evidenceRecordings";

        try {
            var docRef = firestore.collection("users").document(uid).collection(collection).document(id);
            var doc = docRef.get().get();

            if (doc.exists()) {
                docRef.delete().get();
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }
}
