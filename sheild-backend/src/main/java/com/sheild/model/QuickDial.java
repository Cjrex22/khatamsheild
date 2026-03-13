package com.sheild.model;

import com.google.cloud.Timestamp;

public record QuickDial(
    String id, String name, String phone,
    String emoji, Timestamp createdAt
) {}
