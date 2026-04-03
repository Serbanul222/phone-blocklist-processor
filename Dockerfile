# Super simple Dockerfile
FROM node:18-alpine

# Install Python 
RUN apk add --no-cache python3 py3-pip py3-pandas py3-requests

# Create app directory
WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN npm install
RUN pip3 install --break-system-packages openpyxl tqdm xlsxwriter

# Build and run
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]