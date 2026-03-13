package com.sheild.controller;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QuerySnapshot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private Firestore firestore;

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchUsers(@RequestParam String q) throws ExecutionException, InterruptedException {
        String currentUid = null;
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof String) currentUid = (String) principal;
        }

        q = q.toLowerCase();
        Query query = firestore.collection("users")
                .whereGreaterThanOrEqualTo("username", q)
                .whereLessThanOrEqualTo("username", q + "\uf8ff")
                .limit(8);

        QuerySnapshot querySnapshot = query.get().get();
        List<Map<String, Object>> results = new ArrayList<>();

        for (var doc : querySnapshot.getDocuments()) {
            if (currentUid != null && currentUid.equals(doc.getId())) continue;
            
            Map<String, Object> data = doc.getData();
            Map<String, Object> safeUser = new HashMap<>();
            safeUser.put("uid", doc.getId());
            safeUser.put("name", data.get("name"));
            safeUser.put("username", data.get("username"));
            safeUser.put("avatarUrl", data.get("avatarUrl"));
            safeUser.put("avatarColor", data.get("avatarColor"));
            results.add(safeUser);
        }

        return ResponseEntity.ok(results);
    }

    @GetMapping("/check-username")
    public ResponseEntity<Map<String, Boolean>> checkUsername(@RequestParam String username) throws ExecutionException, InterruptedException {
        var doc = firestore.collection("usernames").document(username.toLowerCase()).get().get();
        Map<String, Boolean> result = new HashMap<>();
        result.put("available", !doc.exists());
        return ResponseEntity.ok(result);
    }
}
