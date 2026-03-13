package com.sheild.controller;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteBatch;
import java.util.Base64;
import com.google.firebase.auth.FirebaseAuth;
import com.sheild.service.ImageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private Firestore firestore;
    @Autowired(required = false)
    private FirebaseAuth firebaseAuth;

    @Autowired
    private ImageService imageService;

    private String getUid() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @PostMapping("/profile")
    public ResponseEntity<?> createProfile(@RequestBody Map<String, Object> body) throws Exception {
        String uid = getUid();
        String username = (String) body.get("username");

        WriteBatch batch = firestore.batch();

        body.put("uid", uid);
        body.put("createdAt", Timestamp.now());

        batch.set(firestore.collection("users").document(uid), body);

        Map<String, Object> usernameDoc = new HashMap<>();
        usernameDoc.put("uid", uid);
        batch.set(firestore.collection("usernames").document(username.toLowerCase()), usernameDoc);

        try {
            batch.commit().get();
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() throws Exception {
        String uid = getUid();
        try {
            var doc = firestore.collection("users").document(uid).get().get();
            if (!doc.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            return ResponseEntity.ok(doc.getData());
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> body) throws Exception {
        String uid = getUid();
        try {
            firestore.collection("users").document(uid).update(body).get();
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }

    @PostMapping("/avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file) throws Exception {
        String uid = getUid();
        byte[] compressed = imageService.compressToSquareJpeg(file, 400);

        String base64 = Base64.getEncoder().encodeToString(compressed);
        String url = "data:image/jpeg;base64," + base64;

        Map<String, Object> update = new HashMap<>();
        update.put("avatarUrl", url);
        try {
            firestore.collection("users").document(uid).update(update).get();
            return ResponseEntity.ok(update);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }
    }

    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount() throws Exception {
        String uid = getUid();
        try {
            var doc = firestore.collection("users").document(uid).get().get();
            if (doc.exists()) {
                String username = doc.getString("username");
                if (username != null) {
                    firestore.collection("usernames").document(username.toLowerCase()).delete();
                }
            }
            firestore.collection("users").document(uid).delete();
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Database temporarily unavailable. Please try again.");
        }

        if (firebaseAuth != null) {
            try {
                firebaseAuth.deleteUser(uid);
            } catch (Exception ignored) {
            }
        }

        return ResponseEntity.ok().build();
    }
}
