FROM node:20-alpine

WORKDIR /app

# Instaleaza dependintele Chromium necesare pentru usurat Puppeteer in Alpine
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Spune-i Puppeteer sa foloseasca pachetul instalat, sarind peste descarcare.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000

# Vom rula backendul
CMD ["npm", "run", "dev"]
