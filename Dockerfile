# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY sheild-frontend/package*.json ./
RUN npm install
COPY sheild-frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build

# Install Maven
RUN apt-get update && apt-get install -y maven && apt-get clean

# Copy pom and download dependencies
COPY sheild-backend/pom.xml .
RUN mvn dependency:go-offline -q

# Copy backend source
COPY sheild-backend/src ./src

# Warn at build time if serviceAccountKey.json is absent (not committed to git).
# The app will still build, but FIREBASE_SERVICE_ACCOUNT_KEY_JSON MUST be set
# on the deployment platform (Render → Environment Variables) or the app will
# refuse to start with a clear error message.
RUN if [ -f "src/main/resources/serviceAccountKey.json" ]; then \
      echo "========================================================"; \
      echo "INFO: serviceAccountKey.json found in build context."; \
      echo "Firebase credentials will be embedded in the JAR."; \
      echo "========================================================"; \
    else \
      echo "========================================================"; \
      echo "WARNING: serviceAccountKey.json NOT found in build context."; \
      echo "Firebase credentials will NOT be embedded in the JAR."; \
      echo "YOU MUST set FIREBASE_SERVICE_ACCOUNT_KEY_JSON env var on"; \
      echo "Render (Dashboard -> Environment) or the app will fail."; \
      echo "========================================================"; \
    fi

# Copy frontend build output to backend static resources
COPY --from=frontend-builder /frontend/dist ./src/main/resources/static/

# Build JAR
RUN mvn clean package -DskipTests -q

# Stage 3: Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]


