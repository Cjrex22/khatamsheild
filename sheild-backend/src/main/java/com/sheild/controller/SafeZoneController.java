package com.sheild.controller;

import com.sheild.model.SafeZone;
import com.sheild.model.SafeZoneType;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/safe-zones")
public class SafeZoneController {

    private final RestTemplate restTemplate = new RestTemplate();

    @SuppressWarnings("unchecked")
    @GetMapping("/nearby")
    @Cacheable(value = "safeZoneCache", key = "T(java.lang.Math).round(#lat * 100) + '_' + T(java.lang.Math).round(#lng * 100) + '_' + #radiusMeters")
    public ResponseEntity<List<SafeZone>> getNearbySafeZones(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5000") int radiusMeters) {

        try {
            String overpassQuery = "[out:json][timeout:25];\n" +
                    "(\n" +
                    "  node[\"amenity\"=\"police\"](around:" + radiusMeters + "," + lat + "," + lng + ");\n" +
                    "  way[\"amenity\"=\"police\"](around:" + radiusMeters + "," + lat + "," + lng + ");\n" +
                    "  node[\"amenity\"=\"hospital\"](around:" + radiusMeters + "," + lat + "," + lng + ");\n" +
                    "  way[\"amenity\"=\"hospital\"](around:" + radiusMeters + "," + lat + "," + lng + ");\n" +
                    "  node[\"amenity\"=\"clinic\"][\"healthcare\"=\"hospital\"](around:" + radiusMeters + "," + lat + "," + lng + ");\n" +
                    "  node[\"amenity\"=\"social_facility\"][\"social_facility:for\"=\"women\"](around:" + radiusMeters + "," + lat + "," + lng + ");\n" +
                    "  node[\"amenity\"=\"shelter\"][\"shelter_type\"=\"women\"](around:" + radiusMeters + "," + lat + "," + lng + ");\n" +
                    "  node[\"office\"=\"ngo\"][\"ngo:focus\"=\"women\"](around:" + radiusMeters + "," + lat + "," + lng + ");\n" +
                    ");\n" +
                    "out center tags;";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.add("User-Agent", "SHEildApp/1.0");

            String stringBody = "data=" + URLEncoder.encode(overpassQuery, StandardCharsets.UTF_8);
            HttpEntity<String> request = new HttpEntity<>(stringBody, headers);

            Map<String, Object> response = restTemplate.postForObject("https://overpass-api.de/api/interpreter", request, Map.class);

            if (response == null || !response.containsKey("elements")) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            List<Map<String, Object>> elements = (List<Map<String, Object>>) response.get("elements");
            List<SafeZone> safeZones = new ArrayList<>();

            for (Map<String, Object> element : elements) {
                String id = element.get("id").toString();
                Map<String, String> tags = (Map<String, String>) element.get("tags");
                if (tags == null) continue;

                double zoneLat = 0;
                double zoneLng = 0;
                boolean hasCoords = false;

                if (element.containsKey("lat") && element.containsKey("lon")) {
                    zoneLat = ((Number) element.get("lat")).doubleValue();
                    zoneLng = ((Number) element.get("lon")).doubleValue();
                    hasCoords = true;
                } else if (element.containsKey("center")) {
                    Map<String, Object> center = (Map<String, Object>) element.get("center");
                    zoneLat = ((Number) center.get("lat")).doubleValue();
                    zoneLng = ((Number) center.get("lon")).doubleValue();
                    hasCoords = true;
                }

                if (!hasCoords) continue;

                SafeZoneType type = null;
                String amenity = tags.get("amenity");
                String healthcare = tags.get("healthcare");
                String office = tags.get("office");
                String ngoFocus = tags.get("ngo:focus");
                String shelterType = tags.get("shelter_type");
                String socialFacilityFor = tags.get("social_facility:for");

                if ("police".equals(amenity)) {
                    type = SafeZoneType.POLICE;
                } else if ("hospital".equals(amenity) || ("clinic".equals(amenity) && "hospital".equals(healthcare))) {
                    type = SafeZoneType.HOSPITAL;
                } else if (("social_facility".equals(amenity) && "women".equals(socialFacilityFor)) ||
                        ("shelter".equals(amenity) && "women".equals(shelterType)) ||
                        ("ngo".equals(office) && "women".equals(ngoFocus))) {
                    type = SafeZoneType.HELPLINE;
                } else {
                    if ("social_facility".equals(amenity) || "shelter".equals(amenity)) {
                        type = SafeZoneType.HELPLINE;
                    }
                }

                if (type == null) continue;

                String nameWrapper = tags.getOrDefault("name", tags.getOrDefault("operator", "Unknown"));
                if ("Unknown".equals(nameWrapper)) {
                    if (type == SafeZoneType.POLICE) nameWrapper = "Police Station";
                    else if (type == SafeZoneType.HOSPITAL) nameWrapper = "Hospital / Medical Center";
                    else if (type == SafeZoneType.HELPLINE) nameWrapper = "Women's Support Center";
                }

                String phoneInfo = tags.get("phone");
                if (phoneInfo == null) phoneInfo = tags.get("contact:phone");
                if (phoneInfo == null) phoneInfo = tags.get("contact:mobile");

                String addressStr = null;
                String houseName = tags.get("addr:housename");
                String street = tags.get("addr:street");
                String city = tags.get("addr:city");

                List<String> addrParts = new ArrayList<>();
                if (houseName != null) addrParts.add(houseName);
                if (street != null) addrParts.add(street);
                if (city != null) addrParts.add(city);
                
                if (!addrParts.isEmpty()) {
                    addressStr = String.join(", ", addrParts);
                }

                boolean openNow = false;
                String openingHours = tags.get("opening_hours");
                if ("24/7".equals(openingHours)) {
                    openNow = true;
                } else if (type == SafeZoneType.HOSPITAL && ("yes".equals(tags.get("emergency")) || 
                           (tags.get("healthcare:speciality") != null && tags.get("healthcare:speciality").contains("emergency")))) {
                    openNow = true;
                } else if (openingHours == null) {
                    openNow = true; // benefit of doubt
                }

                double distanceKm = haversine(lat, lng, zoneLat, zoneLng);

                String mapsLink = "https://maps.google.com/?q=" + zoneLat + "," + zoneLng;
                String directionsLink = "https://maps.google.com/maps/dir/?api=1&destination=" + zoneLat + "," + zoneLng;

                safeZones.add(new SafeZone(id, nameWrapper, type, addressStr, phoneInfo, zoneLat, zoneLng, distanceKm, openNow, mapsLink, directionsLink));
            }

            safeZones.sort((a, b) -> Double.compare(a.distanceKm(), b.distanceKm()));
            if (safeZones.size() > 30) {
                safeZones = safeZones.subList(0, 30);
            }

            return ResponseEntity.ok(safeZones);

        } catch (Exception e) {
            System.err.println("Error fetching valid safe zones: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = R * c;
        return Math.round(distance * 100.0) / 100.0;
    }
}
