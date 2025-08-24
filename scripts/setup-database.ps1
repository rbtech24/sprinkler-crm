#!/usr/bin/env powershell

# Sprinkler Repair SaaS - Database Setup Script
# This script sets up PostgreSQL using Docker or native installation

Write-Host "🚀 Setting up PostgreSQL for Sprinkler Repair SaaS..." -ForegroundColor Green

# Check if Docker is installed
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
        
        # Start PostgreSQL with Docker Compose
        Write-Host "🐳 Starting PostgreSQL with Docker..." -ForegroundColor Yellow
        docker-compose up -d postgres redis
        
        # Wait for PostgreSQL to be ready
        Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
        $maxAttempts = 30
        $attempt = 0
        
        do {
            Start-Sleep -Seconds 2
            $attempt++
            $result = docker exec sprinkler_postgres pg_isready -U sprinkler_user -d sprinkler_repair 2>$null
        } while ($LASTEXITCODE -ne 0 -and $attempt -lt $maxAttempts)
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green
        } else {
            Write-Host "❌ PostgreSQL failed to start" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "⚠️ Docker not found. Installing PostgreSQL natively..." -ForegroundColor Yellow
    
    # Check if Chocolatey is installed
    try {
        choco version 2>$null
        Write-Host "✅ Chocolatey found" -ForegroundColor Green
        
        # Install PostgreSQL using Chocolatey
        Write-Host "📦 Installing PostgreSQL..." -ForegroundColor Yellow
        choco install postgresql15 -y
        
        # Wait for installation
        Start-Sleep -Seconds 10
        
        # Create database and user
        Write-Host "🗄️ Setting up database..." -ForegroundColor Yellow
        $env:PGPASSWORD = "postgres"
        
        # Create user and database
        psql -U postgres -c "CREATE USER sprinkler_user WITH PASSWORD 'sprinkler_pass';"
        psql -U postgres -c "CREATE DATABASE sprinkler_repair OWNER sprinkler_user;"
        psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE sprinkler_repair TO sprinkler_user;"
        
        Write-Host "✅ PostgreSQL installed and configured!" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Chocolatey not found. Please install PostgreSQL manually:" -ForegroundColor Red
        Write-Host "1. Download PostgreSQL from https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
        Write-Host "2. Install with default settings" -ForegroundColor Yellow
        Write-Host "3. Create database 'sprinkler_repair' and user 'sprinkler_user'" -ForegroundColor Yellow
        Write-Host "4. Run: npm run migrate" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "🎉 Database setup complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm run migrate" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor White
