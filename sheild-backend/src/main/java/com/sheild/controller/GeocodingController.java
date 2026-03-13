package com.sheild.controller;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.RequestEntity;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/geocode")
public class GeocodingController {

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/reverse")
    @Cacheable(value = "geocodeCache", key = "T(java.lang.Math).round(#lat * 1000) + '_' + T(java.lang.Math).round(#lng * 1000)")
    public ResponseEntity<Map<String, Object>> reverseGeocode(
            @RequestParam double lat, @RequestParam double lng) {
        
        String urlString = UriComponentsBuilder.fromHttpUrl("https://nominatim.openstreetmap.org/reverse")
                .queryParam("lat", lat)
                .queryParam("lon", lng)
                .queryParam("format", "json")
                .toUriString();

        try {
            RequestEntity<Void> request = RequestEntity.get(new URI(urlString))
                    .header(HttpHeaders.USER_AGENT, "SHEildApp/1.0").build();

            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.exchange(request, Map.class);
            Map body = response.getBody();
            
            String locationName = "Unknown Location";
            if (body != null && body.containsKey("address")) {
                @SuppressWarnings("unchecked")
                Map<String, String> address = (Map<String, String>) body.get("address");
                String area = address.getOrDefault("suburb", address.getOrDefault("neighbourhood", ""));
                String city = address.getOrDefault("city", address.getOrDefault("town", address.getOrDefault("village", "")));
                
                if (!area.isEmpty() && !city.isEmpty()) {
                    locationName = area + ", " + city;
                } else if (!area.isEmpty()) {
                    locationName = area;
                } else if (!city.isEmpty()) {
                    locationName = city;
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("locationName", locationName);
            result.put("lat", lat);
            result.put("lng", lng);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("locationName", "Location unavailable");
            fallback.put("lat", lat);
            fallback.put("lng", lng);
            return ResponseEntity.ok(fallback);
        }
    }
}
