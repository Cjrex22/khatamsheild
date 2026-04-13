package com.sheild.service;

import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.WebpushConfig;
import com.google.firebase.messaging.WebpushNotification;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class FcmService {
    public void sendToTokens(List<String> tokens, String type,
        String title, String body, Map<String,String> data) {
        if (tokens == null || tokens.isEmpty()) return;
        
        try {
            MulticastMessage message = MulticastMessage.builder()
                .addAllTokens(tokens)
                .putAllData(data)
                .setNotification(com.google.firebase.messaging.Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build())
                .setAndroidConfig(AndroidConfig.builder()
                  .setPriority("sos".equals(type) ?
                    AndroidConfig.Priority.HIGH : AndroidConfig.Priority.NORMAL)
                  .build())
                .setWebpushConfig(WebpushConfig.builder()
                    .setNotification(WebpushNotification.builder()
                        .setIcon("https://sheild-app-prod-1234.web.app/sheild-pwa-192.png")
                        .build())
                    .build())
                .build();

            BatchResponse response = FirebaseMessaging.getInstance()
                .sendEachForMulticast(message);
        } catch (Exception e) {
            System.err.println("FCM sending failed: " + e.getMessage());
        }
    }
}
