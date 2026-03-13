package com.sheild.model;

import com.google.cloud.Timestamp;

public record EmergencySession(
    String id, String uid, String status,
    Timestamp startedAt, Timestamp resolvedAt,
    double lat, double lng, String locationName,
    String type
) {}
