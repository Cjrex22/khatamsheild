package com.sheild.model;

public record UserSettings(
    int sosCountdownSeconds, boolean autoCallPolice,
    String policeNumber, String sosMessage,
    String vaultPin, boolean biometricEnabled,
    boolean appLockEnabled, boolean liveLocationEnabled,
    String theme, String fontSize
) {}
