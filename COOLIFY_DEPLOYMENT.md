# TicketChain - Coolify Deployment Guide

This guide explains how to deploy TicketChain on Coolify, a self-hosted PaaS platform.

## Prerequisites

1. Coolify instance running and accessible
2. Git repository access (GitHub, GitLab, etc.)
3. Domain name (optional, but recommended)

## Key Changes for Coolify

### 1. Port Configuration

- **Removed hardcoded ports** from docker-compose.coolify.yml
- **Added environment variables** for port configuration
- **Used `expose`** instead of `ports` for internal services

### 2. Environment Variables

The following environment variables should be configured in Coolify:

#### Required Variables:

```bash
# Database Configuration
POSTGRES_DB=ticketchain
POSTGRES_USER=ticketchain
POSTGRES_PASSWORD=<secure_password>

# Application Ports (Coolify will override these)
PORT=8000
FRONTEND_PORT=3000

# API Configuration
NEXT_PUBLIC_API_URL=https://your-api-domain.com

# Blockchain Configuration
ORACLE_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL=http://blockchain:8545

# Contract Addresses (will be set after deployment)
EVENT_MANAGER_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
RESALE_MARKET_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
LOYALTY_POINT_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
LOYALTY_SYSTEM_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
TICKET_NFT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# Security
SECRET_KEY=<generate_secure_random_key>
```

## Deployment Steps

### Step 1: Prepare Repository

1. Ensure `docker-compose.coolify.yml` is in your repository root
2. Commit and push all changes

### Step 2: Create New Service in Coolify

1. Go to your Coolify dashboard
2. Click "New Resource" → "Docker Compose"
3. Select your Git repository
4. Set the compose file path: `docker-compose.coolify.yml`

### Step 3: Configure Environment Variables

In the Coolify service settings, add all the environment variables listed above.

### Step 4: Configure Domains (Optional)

1. Set up domains for your services:
   - API: `api.yourdomain.com`
   - Frontend: `yourdomain.com`
2. Update `NEXT_PUBLIC_API_URL` to match your API domain

### Step 5: Deploy

1. Click "Deploy" in Coolify
2. Monitor the deployment logs
3. Wait for all services to be healthy

## Service Architecture

```
┌─────────────────┐    ┌─────────────────┐
│    Frontend     │────│      API        │
│   (Next.js)     │    │   (FastAPI)     │
│                 │    │                 │
└─────────────────┘    └─────────────────┘
                              │
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    │                         │                         │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   Blockchain    │
│   (Database)    │    │   (Sessions)    │    │   (Hardhat)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Important Notes

### 1. Service Dependencies

- The API depends on PostgreSQL, Redis, and Blockchain services
- All services must be healthy before the API starts
- Use health checks to ensure proper startup order

### 2. Volume Persistence

- PostgreSQL data is persisted in the `postgres_data` volume
- Redis data is persisted in the `redis_data` volume
- Smart contract ABIs are shared via the `contracts-shared` volume

### 3. Networking

- All services communicate through the internal `ticketchain` network
- External access is only provided to API and Frontend services
- Database and Redis are not exposed externally for security

### 4. Monitoring

- Use Coolify's built-in monitoring for service health
- Check logs through the Coolify dashboard
- Monitor resource usage and performance

## Troubleshooting

### Common Issues:

1. **Port Conflicts**: Ensure no hardcoded ports in compose file
2. **Database Connection**: Check PostgreSQL environment variables
3. **Smart Contract Deployment**: Ensure blockchain service is healthy before API starts
4. **Frontend API Calls**: Verify `NEXT_PUBLIC_API_URL` is correctly set

### Debug Commands:

```bash
# Check service logs
docker logs <container_name>

# Check database connection
docker exec -it <api_container> python test_db_connection.py

# Check blockchain status
curl http://blockchain:8545 -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Security Considerations

1. **Change default passwords** in production
2. **Use strong SECRET_KEY** for JWT tokens
3. **Limit external access** to only necessary services
4. **Enable SSL/TLS** for production domains
5. **Regular backups** of PostgreSQL data

## Scaling

For high-traffic scenarios:

1. **Scale API service** horizontally in Coolify
2. **Use external PostgreSQL** (managed database)
3. **Use external Redis** (managed cache)
4. **Implement load balancing** for frontend

This configuration should deploy successfully on Coolify without port conflicts!
