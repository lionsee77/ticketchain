#!/bin/bash

# Startup script for TicketChain API
# This script initializes the database and then starts the FastAPI application

set -e  # Exit on any error

echo "🚀 Starting TicketChain API container..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt/$max_attempts: Testing database connection..."
    
    if uv run python test_db_connection.py; then
        echo "✅ Database connection successful!"
        break
    else
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ Failed to connect to database after $max_attempts attempts"
            exit 1
        fi
        echo "Database not ready, waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    fi
done

# Initialize database (create tables, roles, admin user)
echo "🔧 Initializing database..."
uv run python database/init_db.py

# Start the FastAPI application
echo "🎯 Starting FastAPI application..."
exec uv run uvicorn main:app --host 0.0.0.0 --port 8000