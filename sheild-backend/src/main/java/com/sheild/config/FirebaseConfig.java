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
            serviceAccount = new ByteArrayInputStream(keyJson.getBytes(StandardCharsets.UTF_8));
        } else {
            serviceAccount = serviceAccountKey.getInputStream();
        }
        try {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .setProjectId(System.getenv().getOrDefault("FIREBASE_PROJECT_ID", "sheild-app-prod-1234"))
                    .build();
            return FirebaseApp.initializeApp(options);
        } catch (Exception e) {
            System.err.println("CRITICAL: Failed to initialize FirebaseApp: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Firebase initialization failed fast with a clear message: " + e.getMessage(), e);
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
