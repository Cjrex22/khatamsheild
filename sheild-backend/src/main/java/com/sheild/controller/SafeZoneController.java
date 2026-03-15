package com.sheild.controller;

import com.sheild.model.SafeZone;
import com.sheild.model.SafeZoneType;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/safe-zones")
public class SafeZoneController {

    private final RestTemplate restTemplate;

    public SafeZoneController() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(30_000);
        this.restTemplate = new RestTemplate(factory);
    }

    @GetMapping("/nearby")
    @Cacheable(
        value = "safeZoneCache",
        key = "T(java.lang.Math).round(#lat * 100) + '_' + T(java.lang.Math).round(#lng * 100) + '_' + #radiusMeters"
    )
    public ResponseEntity<List<SafeZone>> getNearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5000") int radiusMeters) {
        try {
            List<SafeZone> zones = fetchFromOverpass(lat, lng, radiusMeters);
            return ResponseEntity.ok(zones);
        } catch (Exception e) {
            System.err.println("[SafeZoneController] Overpass query failed: " + e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    private List<SafeZone> fetchFromOverpass(double lat, double lng, int radius) throws Exception {
        String query = buildOverpassQuery(lat, lng, radius);
        String encodedBody = "data=" + URLEncoder.encode(query, StandardCharsets.UTF_8);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set("User-Agent", "SHEildApp/1.0 (women-safety-app)");

        HttpEntity<String> request = new HttpEntity<>(encodedBody, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
            "https://overpass-api.de/api/interpreter",
            HttpMethod.POST,
            request,
            Map.class
        );

        if (response.getBody() == null) return Collections.emptyList();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> elements =
            (List<Map<String, Object>>) response.getBody().get("elements");

        if (elements == null || elements.isEmpty()) return Collections.emptyList();

        List<SafeZone> zones = new ArrayList<>();
        for (Map<String, Object> element : elements) {
            SafeZone zone = parseElement(element, lat, lng);
            if (zone != null) zones.add(zone);
        }

        zones.sort(Comparator.comparingDouble(SafeZone::distanceKm));
        if (zones.size() > 30) zones = zones.subList(0, 30);
        return zones;
    }

    private String buildOverpassQuery(double lat, double lng, int radius) {
        return "[out:json][timeout:25];\n" +
               "(\n" +
               "  node[\"amenity\"=\"police\"](around:" + radius + "," + lat + "," + lng + ");\n" +
               "  way[\"amenity\"=\"police\"](around:" + radius + "," + lat + "," + lng + ");\n" +
               "  node[\"amenity\"=\"hospital\"](around:" + radius + "," + lat + "," + lng + ");\n" +
               "  way[\"amenity\"=\"hospital\"](around:" + radius + "," + lat + "," + lng + ");\n" +
               "  node[\"amenity\"=\"clinic\"](around:" + radius + "," + lat + "," + lng + ");\n" +
               "  node[\"amenity\"=\"social_facility\"][\"social_facility:for\"=\"women\"](around:" + radius + "," + lat + "," + lng + ");\n" +
               "  node[\"amenity\"=\"shelter\"](around:" + radius + "," + lat + "," + lng + ");\n" +
               "  node[\"office\"=\"ngo\"](around:" + radius + "," + lat + "," + lng + ");\n" +
               ");\n" +
               "out center tags;";
    }

    @SuppressWarnings("unchecked")
    private SafeZone parseElement(Map<String, Object> element, double userLat, double userLng) {
        try {
            double eLat, eLng;
            if (element.containsKey("lat") && element.containsKey("lon")) {
                eLat = toDouble(element.get("lat"));
                eLng = toDouble(element.get("lon"));
            } else if (element.containsKey("center")) {
                Map<String, Object> center = (Map<String, Object>) element.get("center");
                eLat = toDouble(center.get("lat"));
                eLng = toDouble(center.get("lon"));
            } else {
                return null;
            }

            Map<String, Object> tags = element.containsKey("tags")
                ? (Map<String, Object>) element.get("tags")
                : Collections.emptyMap();

            String amenity = tagStr(tags, "amenity");
            String office = tagStr(tags, "office");

            SafeZoneType type;
            if ("police".equals(amenity)) {
                type = SafeZoneType.POLICE;
            } else if ("hospital".equals(amenity) || "clinic".equals(amenity)) {
                type = SafeZoneType.HOSPITAL;
            } else if ("social_facility".equals(amenity) || "shelter".equals(amenity) || "ngo".equals(office)) {
                type = SafeZoneType.HELPLINE;
            } else {
                return null;
            }

            String name = tagStr(tags, "name");
            if (name.isEmpty()) name = tagStr(tags, "operator");
            if (name.isEmpty()) {
                name = switch (type) {
                    case POLICE   -> "Police Station";
                    case HOSPITAL -> "Hospital / Medical Centre";
                    case HELPLINE -> "Women's Support Centre";
                };
            }

            String phone = firstNonEmpty(
                tagStr(tags, "phone"),
                tagStr(tags, "contact:phone"),
                tagStr(tags, "contact:mobile"),
                tagStr(tags, "phone:IN")
            );
            if (phone.isEmpty()) phone = null;

            String address = buildAddress(tags);
            boolean openNow = isOpenNow(tags, type);
            double distKm = haversine(userLat, userLng, eLat, eLng);

            String mapsLink       = "https://maps.google.com/?q=" + eLat + "," + eLng;
            String directionsLink = "https://maps.google.com/maps/dir/?api=1&destination=" + eLat + "," + eLng;
            String id = element.getOrDefault("id", UUID.randomUUID()).toString();

            return new SafeZone(id, name, type, address, phone, eLat, eLng, distKm, openNow, mapsLink, directionsLink);
        } catch (Exception e) {
            System.err.println("[SafeZoneController] Failed to parse element: " + e.getMessage());
            return null;
        }
    }

    private String buildAddress(Map<String, Object> tags) {
        List<String> parts = new ArrayList<>();
        String houseNumber = tagStr(tags, "addr:housenumber");
        String street      = tagStr(tags, "addr:street");
        String suburb      = tagStr(tags, "addr:suburb");
        String city        = tagStr(tags, "addr:city");
        String state       = tagStr(tags, "addr:state");
        if (!houseNumber.isEmpty() && !street.isEmpty()) parts.add(houseNumber + " " + street);
        else if (!street.isEmpty()) parts.add(street);
        if (!suburb.isEmpty()) parts.add(suburb);
        if (!city.isEmpty()) parts.add(city);
        if (!state.isEmpty()) parts.add(state);
        return parts.isEmpty() ? null : String.join(", ", parts);
    }

    private boolean isOpenNow(Map<String, Object> tags, SafeZoneType type) {
        String hours = tagStr(tags, "opening_hours");
        if ("24/7".equalsIgnoreCase(hours)) return true;
        if (type == SafeZoneType.HOSPITAL) {
            if ("yes".equals(tagStr(tags, "emergency"))) return true;
        }
        return hours.isEmpty();
    }

    private String tagStr(Map<String, Object> tags, String key) {
        Object val = tags.get(key);
        return val != null ? val.toString().trim() : "";
    }

    private String firstNonEmpty(String... values) {
        for (String v : values) if (v != null && !v.isEmpty()) return v;
        return "";
    }

    private double toDouble(Object val) {
        if (val instanceof Number n) return n.doubleValue();
        return Double.parseDouble(val.toString());
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 100.0) / 100.0;
    }
}
