package com.sheild.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {
    @Value("${FRONTEND_URL:http://localhost:5173}")
    private String frontendUrl;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        String railwayUrl = System.getenv("RAILWAY_STATIC_URL");
        if (railwayUrl != null && !railwayUrl.startsWith("http")) railwayUrl = "https://" + railwayUrl;

        config.setAllowedOrigins(java.util.Arrays.asList(
            "http://localhost:5173",
            "http://localhost:4173",
            "https://sheild-app-prod-1234.web.app",
            "https://sheild-app-prod-1234.firebaseapp.com",
            frontendUrl,
            railwayUrl
        ).stream().filter(java.util.Objects::nonNull).collect(java.util.stream.Collectors.toList()));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
