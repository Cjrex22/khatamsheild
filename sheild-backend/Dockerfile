# Build stage
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build

# Install Maven
RUN apt-get update && apt-get install -y maven && apt-get clean

# Copy pom and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy all source (including pre-built frontend in src/main/resources/static/)
ARG CACHE_BUSTER=1
COPY src ./src

# Build JAR
RUN mvn clean package -DskipTests -q

# Runtime stage
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
