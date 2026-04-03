# Super simple Dockerfile (FIXED for local testing)
FROM node:18-alpine

# Install Python, pip, and build tools
# We REMOVED py3-pandas and py3-requests from here.
RUN apk add --no-cache \
    python3 \
    py3-pip \
    python3-dev \
    build-base \
    gcc \
    musl-dev \
    linux-headers \
    && ln -sf python3 /usr/bin/python

# Create app directory
WORKDIR /app

# Copy package.json first for layer caching
COPY package.json package-lock.json* ./

# Install npm dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Install ALL Python dependencies from requirements.txt using pip
# This fixes the binary incompatibility error.
RUN pip3 install --no-cache-dir --break-system-packages setuptools wheel
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Build and run
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]