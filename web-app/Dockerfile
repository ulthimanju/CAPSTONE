FROM node:20-alpine

WORKDIR /app

# Copy package manifests first for optimal layer caching
COPY package.json package-lock.json* ./

RUN npm install

# Copy source files
COPY . .

EXPOSE 5173

# Run Vite development server with host binding for Docker HMR
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
