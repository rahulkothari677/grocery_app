FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose port
EXPOSE 5000

# Set environment variables defaults
ENV PORT=5000
ENV NODE_ENV=production

# Run the app
CMD [ "node", "server.js" ]
