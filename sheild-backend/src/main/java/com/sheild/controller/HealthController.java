package com.sheild.controller;

import com.google.cloud.firestore.Firestore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicBoolean;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @Autowired
    private Firestore firestore;

    // Cache Firestore status so UptimeRobot pings don't hammer Firestore.
    // Re-check Firestore at most once every 5 minutes.
    private final AtomicBoolean lastFirestoreOk = new AtomicBoolean(true);
    private final AtomicLong  lastCheckedAt    = new AtomicLong(0);
    private static final long CHECK_INTERVAL_MS = 5 * 60 * 1000L;

    /**
     * Lightweight liveness probe for Render & UptimeRobot.
     * Always returns HTTP 200 as long as the JVM is alive.
     * Firestore status is cached — checked at most once per 5 minutes.
     */
    @GetMapping
    public ResponseEntity<?> checkHealth() {
        long now = System.currentTimeMillis();
        if (now - lastCheckedAt.get() > CHECK_INTERVAL_MS) {
            lastCheckedAt.set(now);
            try {
                firestore.collection("_health").document("ping")
                    .set(Map.of("ts", now))
                    .get(5, TimeUnit.SECONDS);
                lastFirestoreOk.set(true);
            } catch (Exception e) {
                lastFirestoreOk.set(false);
                System.err.println("[Health] Firestore check failed: " + e.getMessage());
            }
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status",    "ok"); // always 200 so Render never restarts due to health probe
        body.put("firestore", lastFirestoreOk.get() ? "ok" : "degraded");
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(body);
    }

    /**
     * Deep Firestore probe — call this manually to diagnose issues.
     * NOT used by Render or UptimeRobot.
     */
    @GetMapping("/db")
    public ResponseEntity<?> checkDb() {
        String firestoreStatus;
        try {
            firestore.collection("_health").document("deep-check")
                .set(Map.of("ts", System.currentTimeMillis()))
                .get(8, TimeUnit.SECONDS);
            firestoreStatus = "ok";
        } catch (Exception e) {
            firestoreStatus = "ERROR: " + e.getMessage();
        }

        boolean healthy = "ok".equals(firestoreStatus);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status",             healthy ? "ok" : "degraded");
        body.put("firestore",          firestoreStatus);
        body.put("credentialSource",   System.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_JSON") != null
                                           ? "ENV_VAR" : "CLASSPATH_FILE");
        body.put("firestoreProject",   System.getenv().getOrDefault("FIREBASE_PROJECT_ID", "sheild-app-prod-1234"));
        body.put("timestamp",          Instant.now().toString());
        return ResponseEntity.status(healthy ? 200 : 503).body(body);
    }

    @GetMapping("/debug")
    public ResponseEntity<?> debug() {
        return ResponseEntity.ok(Map.of(
            "message",          "Debug endpoint active",
            "credentialSource", System.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_JSON") != null
                                    ? "ENV_VAR" : "CLASSPATH_FILE",
            "firestoreProject", System.getenv().getOrDefault("FIREBASE_PROJECT_ID", "sheild-app-prod-1234"),
            "timestamp",        Instant.now().toString()
        ));
    }
}
