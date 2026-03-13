package com.sheild.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve static assets from classpath:/static/
        // For SPA: if a resource is not found, fall back to index.html
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requested = location.createRelative(resourcePath);
                        // If the requested resource exists AND is readable, serve it
                        // Otherwise, serve index.html (SPA fallback)
                        if (requested.exists() && requested.isReadable()) {
                            return requested;
                        }
                        // Don't fallback for API routes - let Spring handle those
                        if (resourcePath.startsWith("api/")) {
                            return null;
                        }
                        
                        Resource fallback = location.createRelative("index.html");
                        if (fallback.exists() && fallback.isReadable()) {
                            return fallback;
                        }
                        return null;
                    }
                });
    }
}
