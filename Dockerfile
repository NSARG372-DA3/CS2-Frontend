# # Build Stage
# FROM node:18-alpine AS build
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run dev
 
# # Production Stage
# FROM nginx:stable-alpine AS production
# COPY --from=build /app/build /usr/share/nginx/html
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]

# Use a lightweight Node.js image as the base
FROM node:lts-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) first to leverage Docker's cache
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Expose the port where the React development server will run (e.g., 3000 for Create React App, 5173 for Vite)
EXPOSE 3000

# Command to start the React development server
# For Create React App:
CMD ["npm", "start"]
# For Vite:
# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]