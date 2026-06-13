# ---- Stage 1: build the React frontend ----
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend runtime ----
FROM node:20-slim
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./
# Bring the built frontend into the backend's static dir
COPY --from=frontend /app/frontend/dist ./public
ENV PORT=8080
EXPOSE 8080
CMD ["node", "src/server.js"]
