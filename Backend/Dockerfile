# Use the latest official Node.js LTS image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application
COPY . .

# Do not run the application as root inside the container.
USER node

# Expose the port your app runs on
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
