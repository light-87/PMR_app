# Production Deployment Guide

This guide covers deploying the PMR application to production with Google Drive backup functionality.

## Prerequisites

- A production hosting environment (Vercel, Railway, Render, etc.)
- PostgreSQL database for production
- Google Cloud Project with OAuth credentials configured
- Production domain name (optional but recommended)

## Step 1: Production Environment Variables

Set up the following environment variables in your production environment:

### Database
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Authentication
```
JWT_SECRET=your-production-secret-key-min-32-chars
```
**IMPORTANT:** Use a different, secure JWT_SECRET for production (not the same as development)

### Google Drive OAuth (for Backups)

You have two options for production Google Drive setup:

#### Option A: Use Same Credentials as Development (Simple)
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/google
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id
```

**Note:** Update `GOOGLE_REDIRECT_URI` to your production domain. You'll need to add this redirect URI to your Google Cloud Console OAuth configuration.

#### Option B: Create Separate Production Credentials (Recommended)

For better security and separation, create separate OAuth credentials for production:

1. In Google Cloud Console, create a new OAuth 2.0 Client ID for production
2. Add your production redirect URI: `https://yourdomain.com/api/auth/callback/google`
3. Generate a new refresh token using the production credentials
4. Use a separate Google Drive folder for production backups

## Step 2: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Click on your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add:
   - `https://yourdomain.com/api/auth/callback/google`
   - Replace `yourdomain.com` with your actual production domain
5. Click "Save"

## Step 3: Deploy Application

### For Vercel:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to production
vercel --prod
```

Set environment variables in Vercel Dashboard:
- Project Settings > Environment Variables
- Add all variables from Step 1
- Select "Production" environment

### For Railway:

```bash
# Install Railway CLI if not already installed
npm i -g @railway/cli

# Login and link project
railway login
railway link

# Set environment variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set JWT_SECRET="..."
# ... add all other variables

# Deploy
railway up
```

### For Render:

1. Create a new Web Service
2. Connect your GitHub repository
3. Set environment variables in the Environment tab
4. Deploy

## Step 4: Database Migration

After deployment, run database migrations:

```bash
# For Vercel with Prisma
npx prisma migrate deploy

# Or if you need to push schema changes
npx prisma db push
```

## Step 5: Verify Backup Functionality

1. Log in to your production application as an admin
2. Navigate to Admin Dashboard
3. Click "Create Manual Backup"
4. Verify:
   - Backup completes successfully
   - Backup file appears in your Google Drive folder
   - No error messages appear

## Step 6: Monitor Automatic Backups

The application creates automatic backups:
- Every 24 hours when an admin signs in
- Monitor the backup logs in the Admin Dashboard
- Check your Google Drive folder to verify backups are being created

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` file to version control
- Use different credentials for development and production
- Rotate credentials periodically

### 2. JWT Secret
- Use a strong, randomly generated secret for production
- Minimum 32 characters
- Never reuse development secrets

### 3. Google Drive
- Use a separate Google Drive folder for production backups
- Restrict folder access to only necessary users
- Regularly audit OAuth access in Google Account settings

### 4. Database
- Use connection pooling in production
- Enable SSL for database connections
- Regular database backups (in addition to application backups)

### 5. CORS & Security Headers
- Configure proper CORS policies
- Enable security headers (CSP, HSTS, etc.)
- Use HTTPS only in production

## Troubleshooting Production Issues

### Backup Fails with "No access, refresh token" Error

**Cause:** Production redirect URI not configured correctly

**Solution:**
1. Verify `GOOGLE_REDIRECT_URI` matches your production domain
2. Ensure this URI is added to Google Cloud Console
3. Regenerate refresh token if necessary

### Database Connection Issues

**Cause:** Connection pooling or timeout issues

**Solution:**
- For Vercel/serverless: Use connection pooling (Prisma Accelerate or PgBouncer)
- Increase connection timeout settings
- Check database connection limits

### Backups Not Running Automatically

**Cause:** No admin sign-ins or cron jobs not configured

**Solution:**
- Automatic backups trigger on admin sign-in (every 24 hours)
- Consider setting up a cron job to trigger backups
- Check application logs for errors

## Setting Up Automated Backups (Optional)

For guaranteed daily backups without requiring admin sign-in:

### Option 1: Using Vercel Cron Jobs

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/backup/cron",
    "schedule": "0 2 * * *"
  }]
}
```

Create `/api/admin/backup/cron/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createBackup } from '@/lib/backup'

export async function GET(request: Request) {
  // Verify request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await createBackup('AUTOMATIC')
  return NextResponse.json(result)
}
```

Add `CRON_SECRET` to your environment variables.

### Option 2: External Cron Service

Use services like:
- EasyCron
- cron-job.org
- GitHub Actions

Configure to hit your backup endpoint daily with proper authentication.

## Monitoring & Maintenance

### Regular Checks
- Monitor backup success rate weekly
- Review error logs for backup failures
- Verify backup files can be downloaded from Google Drive
- Test backup restoration process quarterly

### Backup Retention
- Google Drive has unlimited storage for most accounts
- Consider implementing backup rotation if needed
- Archive old backups to a separate folder monthly

### Updates & Patches
- Keep dependencies updated
- Monitor for Google API changes
- Test backup functionality after major updates

## Rollback Plan

If you need to rollback:

1. Keep previous deployment accessible
2. Maintain database backups
3. Document all environment variable changes
4. Test rollback procedure in staging first

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)
- [Google Drive API Best Practices](https://developers.google.com/drive/api/guides/performance)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
