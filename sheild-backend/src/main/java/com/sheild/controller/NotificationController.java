package com.sheild.controller;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteBatch;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired private Firestore firestore;

    private String getUid() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getNotifications() throws Exception {
        String uid = getUid();
        try {
            QuerySnapshot query = firestore.collection("notifications").document(uid).collection("items")
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(50).get().get();
                
            List<Map<String, Object>> results = new ArrayList<>();
            for (var doc : query.getDocuments()) {
                Map<String, Object> data = doc.getData();
                data.put("id", doc.getId());
                results.add(data);
            }
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable String id) throws Exception {
        String uid = getUid();
        try {
            firestore.collection("notifications").document(uid).collection("items").document(id)
                .update("read", true).get();
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllRead() throws Exception {
        String uid = getUid();
        try {
            QuerySnapshot unread = firestore.collection("notifications").document(uid).collection("items")
                .whereEqualTo("read", false).get().get();
                
            WriteBatch batch = firestore.batch();
            for (var doc : unread.getDocuments()) {
                batch.update(doc.getReference(), "read", true);
            }
            batch.commit().get();
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }
}
