package com.sheild.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private FirebaseAuthFilter firebaseAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {}) 
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/", 
                    "/index.html", 
                    "/assets/**", 
                    "/static/**", 
                    "/*.js", 
                    "/*.css", 
                    "/*.ico", 
                    "/*.png", 
                    "/*.svg",
                    "/*.json", 
                    "/*.webmanifest",
                    "/*.html",
                    "/manifest.json", 
                    "/manifest.webmanifest",
                    "/firebase-messaging-sw.js",
                    "/sw.js",
                    "/registerSW.js",
                    "/workbox-*.js",
                    "/api/health",
                    "/api/health/**",
                    "/error"
                ).permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(firebaseAuthFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
