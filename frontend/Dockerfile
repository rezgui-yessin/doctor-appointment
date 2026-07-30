# Build Stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build the Angular app for production
RUN npm run build -- --configuration production

# Serve Stage
FROM nginx:alpine
# Copy the compiled app to the nginx html directory
COPY --from=build /app/dist/doctor-appointment-frontend/browser /usr/share/nginx/html
# Provide a custom nginx configuration to handle Angular routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
