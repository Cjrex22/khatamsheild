package com.sheild.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class FirebaseAuthFilter extends OncePerRequestFilter {
    
    @Autowired(required=false)
    private FirebaseAuth firebaseAuth;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        // Skip auth filter entirely for non-API paths (static assets, SPA routes)
        // and for the health endpoint
        return !path.startsWith("/api/") || path.startsWith("/api/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req,
        HttpServletResponse res, FilterChain chain)
        throws ServletException, IOException {
        
      if (firebaseAuth == null) {
          chain.doFilter(req, res);
          return;
      }

      String authHeader = req.getHeader("Authorization");
      if (authHeader != null && authHeader.startsWith("Bearer ")) {
        String idToken = authHeader.substring(7);
        try {
          FirebaseToken decoded = firebaseAuth.verifyIdToken(idToken);
          String uid = decoded.getUid();
          UsernamePasswordAuthenticationToken auth =
            new UsernamePasswordAuthenticationToken(uid, null,
              List.of(new SimpleGrantedAuthority("ROLE_USER")));
          auth.setDetails(decoded);
          SecurityContextHolder.getContext().setAuthentication(auth);
        } catch (FirebaseAuthException e) {
          res.setStatus(HttpStatus.UNAUTHORIZED.value());
          res.getWriter().write("{\"error\":\"Invalid token\"}");
          return;
        }
      }
      chain.doFilter(req, res);
    }
}
