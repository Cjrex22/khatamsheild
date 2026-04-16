package com.sheild.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import com.google.firebase.cloud.StorageClient;
import com.google.firebase.messaging.FirebaseMessaging;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Configuration
public class FirebaseConfig {
    @Value("${firebase.service-account-key}")
    private org.springframework.core.io.Resource serviceAccountKey;


    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }
        InputStream serviceAccount;
        String keyJson = System.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_JSON");
        if (keyJson != null && !keyJson.trim().isEmpty()) {
            // Normalize \n: Render/Docker env vars sometimes store literal backslash-n
            // instead of real newlines inside the private_key field. Fix both directions.
            keyJson = keyJson.replace("\\n", "\n");
            serviceAccount = new ByteArrayInputStream(keyJson.getBytes(StandardCharsets.UTF_8));
            System.out.println("[Firebase] ✅ Credentials loaded from FIREBASE_SERVICE_ACCOUNT_KEY_JSON env var.");
        } else if (serviceAccountKey.exists()) {
            serviceAccount = serviceAccountKey.getInputStream();
            System.out.println("[Firebase] ✅ Credentials loaded from classpath:serviceAccountKey.json.");
        } else {
            String msg =
                "FATAL: No Firebase credentials found. " +
                "Neither FIREBASE_SERVICE_ACCOUNT_KEY_JSON env var is set, " +
                "nor does classpath:serviceAccountKey.json exist in the JAR. " +
                "→ On Render: go to Dashboard → Environment and add the full " +
                "serviceAccountKey.json content as FIREBASE_SERVICE_ACCOUNT_KEY_JSON. " +
                "→ Locally: ensure sheild-backend/src/main/resources/serviceAccountKey.json exists.";
            System.err.println("[Firebase] ❌ " + msg);
            throw new IllegalStateException(msg);
        }
        try {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .setProjectId(System.getenv().getOrDefault("FIREBASE_PROJECT_ID", "sheild-app-prod-1234"))
                    .build();
            FirebaseApp app = FirebaseApp.initializeApp(options);
            System.out.println("[Firebase] ✅ FirebaseApp initialized for project: " +
                System.getenv().getOrDefault("FIREBASE_PROJECT_ID", "sheild-app-prod-1234"));
            return app;
        } catch (Exception e) {
            System.err.println("[Firebase] ❌ CRITICAL: Failed to initialize FirebaseApp: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException(
                "Firebase initialization failed. Check FIREBASE_SERVICE_ACCOUNT_KEY_JSON on Render. " +
                "Error: " + e.getMessage(), e);
        }
    }

    @Bean
    public Firestore firestore() throws IOException {
        firebaseApp();
        return FirestoreClient.getFirestore();
    }

    @Bean
    public FirebaseAuth firebaseAuth() throws IOException {
        firebaseApp();
        return FirebaseAuth.getInstance();
    }

    @Bean
    public FirebaseMessaging fcm() throws IOException {
        firebaseApp();
        return FirebaseMessaging.getInstance();
    }
}
