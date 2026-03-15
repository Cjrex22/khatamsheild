package com.sheild.model;

public record SafeZone(
    String id,
    String name,
    SafeZoneType type,
    String address,
    String phone,
    double lat,
    double lng,
    double distanceKm,
    boolean openNow,
    String mapsLink,
    String directionsLink
) {}
