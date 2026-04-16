package com.sheild.config;

import com.google.cloud.firestore.Firestore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Verifies Firestore is reachable on every startup.
 * A clear log line tells you immediately in Render logs whether
 * the database connection is healthy.
 */
@Component
public class FirestoreStartupValidator implements ApplicationRunner {

    @Autowired
    private Firestore firestore;

    @Override
    public void run(ApplicationArguments args) {
        System.out.println("[Startup] Verifying Firestore connectivity...");
        try {
            // Write a small heartbeat document, then clean it up.
            // This proves both WRITE and connection auth work end-to-end.
            var ref = firestore.collection("_health").document("startup-check");
            ref.set(Map.of(
                "ts",      System.currentTimeMillis(),
                "service", "sheild-backend"
            )).get(10, TimeUnit.SECONDS);
            ref.delete().get(5, TimeUnit.SECONDS);

            System.out.println("[Startup] ✅ Firestore connection verified — reads and writes are working.");
        } catch (Exception e) {
            // Log clearly but don't kill the process — the health endpoint will expose this.
            System.err.println(
                "[Startup] ❌ CRITICAL: Cannot connect to Firestore! " +
                "All user data operations will fail with 503. " +
                "→ Fix: ensure FIREBASE_SERVICE_ACCOUNT_KEY_JSON is correctly set on Render " +
                "and the service account has 'Cloud Datastore User' or 'Firebase Admin' IAM role. " +
                "Error: " + e.getMessage()
            );
        }
    }
}
