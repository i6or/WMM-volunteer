# Railway Deployment Guide for Salesforce Integration

## Overview
This guide explains how to deploy the WMM Volunteer Connect app to Railway with working Salesforce integration.

## Prerequisites
- Railway account
- Salesforce credentials (username, password, security token)
- GitHub repository with the code

## Environment Variables

In Railway dashboard, set the following environment variables:

### Salesforce Configuration
```
SALESFORCE_USERNAME=your_salesforce_username@example.com
SALESFORCE_PASSWORD=your_salesforce_password
SALESFORCE_SECURITY_TOKEN=your_salesforce_security_token
SALESFORCE_DOMAIN=login
```

**Note**: For sandbox environments, use `SALESFORCE_DOMAIN=test`

### Database Configuration
```
DATABASE_URL=postgresql://username:password@host:5432/database
```

### Application Configuration
```
NODE_ENV=production
PORT=5000
```

## Deployment Steps

1. **Connect Repository**
   - Connect your GitHub repository to Railway
   - Railway will automatically detect the Node.js application

2. **Configure Environment Variables**
   - Go to your service settings in Railway
   - Add all the environment variables listed above
   - Make sure to include your actual Salesforce credentials

3. **Deploy**
   - Railway will automatically build and deploy your application
   - The build process includes:
     - Installing Node.js dependencies
     - Building the frontend with Vite
     - Installing Python dependencies (simple-salesforce)
     - Starting the production server

4. **Verify Deployment**
   - Check the deployment logs for any errors
   - Test the health endpoint: `https://your-app.railway.app/api/health`
   - Test Salesforce connection: `https://your-app.railway.app/api/salesforce/test`

## Troubleshooting

### Salesforce Connection Issues
1. **Check Environment Variables**: Ensure all Salesforce credentials are correctly set
2. **Security Token**: Make sure the security token is valid and not expired
3. **IP Restrictions**: Verify your Salesforce org allows connections from Railway's IP ranges
4. **Python Dependencies**: Check that simple-salesforce was installed successfully

### Common Error Messages

#### "simple-salesforce not installed"
- This means the Python dependency installation failed
- Check the build logs for pip installation errors
- Verify the requirements.txt file exists

#### "Salesforce credentials not configured"
- Environment variables are missing
- Check Railway service settings
- Ensure variables are set in the correct environment (production vs preview)

#### "Invalid login or security token"
- Salesforce credentials are incorrect
- Security token may be expired
- User may be locked or password changed

### Testing the Connection

After deployment, test the Salesforce integration:

1. **Health Check**
   ```bash
   curl https://your-app.railway.app/api/health
   ```

2. **Salesforce Test**
   ```bash
   curl https://your-app.railway.app/api/salesforce/test
   ```

3. **Sync Opportunities**
   ```bash
   curl -X POST https://your-app.railway.app/api/salesforce/sync
   ```

## Files Created for Railway Integration

- `railway.json`: Railway-specific configuration
- `requirements.txt`: Python dependencies
- `Procfile`: Process definition for deployment
- `.env.example`: Environment variable template

## Monitoring

- Railway provides built-in monitoring and logs
- Check the health endpoint regularly
- Monitor Salesforce API usage in your Salesforce org

## Security Notes

- Never commit actual credentials to your repository
- Use Railway's environment variables for sensitive data
- Regularly rotate Salesforce security tokens
- Monitor API usage and access logs
