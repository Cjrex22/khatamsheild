package com.sheild.model;

import com.google.cloud.Timestamp;

public record GuardCircleDetail(
    String uid, String name, String username,
    String avatarUrl, String avatarColor, Timestamp addedAt
) {}
