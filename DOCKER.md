# Docker Setup Guide

This guide explains how to run the Credit Card Rewards Maximizer application using Docker.

## Prerequisites

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)
- GROQ API key for the backend AI features (optional - app will use rule-based fallback if not provided)

## Quick Start

### 1. Set Up Environment Variables (Optional)

**Note:** The application will work without a GROQ API key by using rule-based recommendations instead of AI-powered ones.

If you have a GROQ API key, create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your GROQ API key:
```
GROQ_API_KEY=your_groq_api_key_here
```

If you don't have a GROQ API key, the app will automatically fall back to rule-based recommendations.

### 2. Run with Docker Compose

From the project root directory:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

### 3. Access the Application

- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Frontend (Expo Web)**: http://localhost:19006
- **Health Check**: http://localhost:8000/health

## Individual Service Commands

### Backend Only

```bash
# Build the backend image
docker build -t credit-card-backend ./backend

# Run the backend container
docker run -p 8000:8000 --env-file ./backend/.env credit-card-backend
```

### Frontend Only

```bash
# Build the frontend image
docker build -t credit-card-frontend ./frontend

# Run the frontend container
docker run -p 19006:19006 -p 8081:8081 credit-card-frontend
```

## Docker Compose Commands

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild services
docker-compose up --build

# Remove all containers and volumes
docker-compose down -v
```

## Development Workflow

### Hot Reload

Both services are configured with volume mounts for hot reloading:
- Backend: Changes to Python files will auto-reload
- Frontend: Changes to React Native files will trigger Metro bundler refresh

### Debugging

Access container shells:
```bash
# Backend shell
docker-compose exec backend /bin/bash

# Frontend shell
docker-compose exec frontend /bin/sh
```

### View Container Status

```bash
docker-compose ps
```

## Environment Variables

### Backend (.env)
```
GROQ_API_KEY=your_groq_api_key_here
```

### Frontend
The frontend connects to the backend via the Docker network. If running frontend outside Docker, update the API URL in your service configuration.

## Troubleshooting

### Port Already in Use
If you get a port conflict error:
```bash
# Find and kill the process using the port
lsof -ti:8000 | xargs kill -9  # For backend
lsof -ti:19006 | xargs kill -9 # For frontend
```

### Container Won't Start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Remove all containers and rebuild
docker-compose down
docker-compose up --build
```

### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
```

### Clear Docker Cache
```bash
# Remove all unused containers, networks, and images
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

## Production Deployment

For production, consider:

1. **Use production-ready WSGI server** (already using uvicorn)
2. **Set proper environment variables**
3. **Use Docker secrets** for sensitive data
4. **Configure reverse proxy** (nginx)
5. **Set up SSL/TLS certificates**
6. **Use Docker Swarm or Kubernetes** for orchestration

### Production Docker Compose Example

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
    restart: always
    
  frontend:
    build: ./frontend
    restart: always
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
      - frontend
```

## Health Checks

The backend includes a health check endpoint:
```bash
curl http://localhost:8000/health
```

Docker will automatically restart unhealthy containers.

## Network Architecture

```
┌─────────────┐
│   Frontend  │ :19006
│  (Expo Web) │
└──────┬──────┘
       │
       │ app-network
       │
┌──────▼──────┐
│   Backend   │ :8000
│  (FastAPI)  │
└─────────────┘
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Docker Guide](https://fastapi.tiangolo.com/deployment/docker/)
- [Expo Docker Guide](https://docs.expo.dev/)
