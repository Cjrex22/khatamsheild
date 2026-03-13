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


