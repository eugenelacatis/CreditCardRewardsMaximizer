# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install Expo CLI globally
RUN npm install -g expo-cli

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy application code
COPY . .

# Install react-native-web for web support
RUN npx expo install react-native-web react-dom

# Expose Expo web port
EXPOSE 19006

# Expose Metro bundler port
EXPOSE 8081

# Expose Expo DevTools port
EXPOSE 19002

# Set environment variable for Expo
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

# Start Expo web (using lan mode for Docker)
CMD ["npx", "expo", "start", "--web", "--host", "lan"]
