# Build the Angular application
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run build -- --configuration production

# Serve the compiled SPA with Nginx
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/task-management/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
