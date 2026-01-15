# API Connection Test Results

## Test Date
Generated: $(Get-Date)

## Current Status
❌ **API Server is NOT running correctly**

## Test Results
All endpoints returned **404 Not Found**, which indicates:
- Something is listening on port 5000
- But it's not the Express API server with the expected routes

## Endpoints Tested
1. `/api/health` - Health check endpoint
2. `/api/version` - Version information
3. `/api/debug/db-connection` - Database connection test
4. `/api/programs` - Programs list
5. `/api/workshops` - Workshops list

## How to Start the Server

### Development Mode
```bash
npm run dev
```

This will:
- Set NODE_ENV=development
- Start the server with tsx
- Serve on port 5000 (or PORT env variable)

### Production Mode
```bash
npm run build
npm start
```

## After Starting the Server

Run the test script again:
```bash
node test-api.mjs
```

Or test manually:
```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing

# Version check
Invoke-WebRequest -Uri "http://localhost:5000/api/version" -UseBasicParsing

# Database connection
Invoke-WebRequest -Uri "http://localhost:5000/api/debug/db-connection" -UseBasicParsing
```

## Expected Responses

### Health Check (`/api/health`)
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "version": "1.0.0"
}
```

### Version (`/api/version`)
```json
{
  "version": "2024-12-11-v17-lead-if-no-contact",
  "timestamp": "2025-01-XX..."
}
```

### Database Connection (`/api/debug/db-connection`)
```json
{
  "success": true,
  "connectionInfo": {...},
  "testQuery": "Success",
  "databaseName": "...",
  "version": "..."
}
```

## Troubleshooting

1. **Port already in use**: Check what's using port 5000
   ```powershell
   netstat -ano | findstr :5000
   ```

2. **Environment variables**: Make sure DATABASE_URL and other required env vars are set

3. **Dependencies**: Ensure all packages are installed
   ```bash
   npm install
   ```

4. **Database connection**: Verify DATABASE_URL is correct and database is accessible




