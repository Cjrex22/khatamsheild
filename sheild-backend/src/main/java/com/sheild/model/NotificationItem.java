package com.sheild.model;

import com.google.cloud.Timestamp;

public record NotificationItem(
    String id, String type, String fromUid, String fromName,
    String fromUsername, String fromAvatarUrl, String message,
    String locationName, Double lat, Double lng, String mapsLink,
    boolean read, Timestamp createdAt
) {}
