package com.sheild.model;

import com.google.cloud.Timestamp;
import java.util.List;

public record UserProfile(
    String uid, String email, String name, String username,
    String phone, String avatarUrl, String avatarColor,
    String bloodType, String medicalNotes,
    List<String> guardCircle, String fcmToken,
    Timestamp createdAt, UserSettings settings
) {}
