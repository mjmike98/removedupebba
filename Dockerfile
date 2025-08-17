# Use Node.js LTS
FROM node:18

# Create app directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the files
COPY . .

# Run the bot
CMD ["node", "index.js"]
