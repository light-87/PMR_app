# Google Drive Backup Setup Guide

This guide will help you configure Google Drive API for automatic backups in the PMR application.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Node.js and npm installed

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top and select "New Project"
3. Enter a project name (e.g., "PMR Backup") and click "Create"
4. Wait for the project to be created and select it

## Step 2: Enable Google Drive API

1. In your Google Cloud project, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the required fields (App name, User support email, Developer contact)
   - Add the scope: `https://www.googleapis.com/auth/drive.file`
   - Add yourself as a test user
   - Click "Save and Continue"
4. Now create the OAuth client ID:
   - Application type: "Web application"
   - Name: "PMR Backup Client"
   - Authorized redirect URIs: Add your redirect URI
     - For local development: `http://localhost:3000/api/auth/callback/google`
     - For production: `https://yourdomain.com/api/auth/callback/google`
   - Click "Create"
5. Copy the **Client ID** and **Client Secret** - you'll need these

## Step 4: Get Refresh Token

You need to generate a refresh token to allow the application to access Google Drive on your behalf.

### Option A: Using OAuth 2.0 Playground (Recommended)

1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right corner
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret from Step 3
5. In the left panel, scroll down and select "Drive API v3"
6. Check the scope: `https://www.googleapis.com/auth/drive.file`
7. Click "Authorize APIs"
8. Sign in with your Google account and grant permissions
9. Click "Exchange authorization code for tokens"
10. Copy the **Refresh token** - you'll need this

### Option B: Using a Script

Create a file `get-refresh-token.js`:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Refresh Token:', token.refresh_token);
  });
});
```

Run it:
```bash
node get-refresh-token.js
```

## Step 5: Create Google Drive Folder

1. Go to [Google Drive](https://drive.google.com/)
2. Create a new folder for backups (e.g., "PMR Backups")
3. Open the folder and copy the folder ID from the URL:
   - URL format: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
   - Copy the `FOLDER_ID_HERE` part

## Step 6: Configure Environment Variables

Create or update your `.env` file in the project root:

```env
# Google Drive API (for backups)
GOOGLE_CLIENT_ID="your-client-id-from-step-3"
GOOGLE_CLIENT_SECRET="your-client-secret-from-step-3"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/callback/google"
GOOGLE_REFRESH_TOKEN="your-refresh-token-from-step-4"
GOOGLE_DRIVE_FOLDER_ID="your-folder-id-from-step-5"
```

**Important Notes:**
- Never commit your `.env` file to version control
- For production, update the `GOOGLE_REDIRECT_URI` to your production URL
- Keep your Client Secret and Refresh Token secure

## Step 7: Verify Configuration

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Log in as an admin user
3. Go to the Admin Dashboard
4. Look at the Backup Manager section
5. Click "Create Manual Backup"
6. If configured correctly, you should see a success message
7. Check your Google Drive folder to verify the backup file was created

## Troubleshooting

### "unauthorised_client" Error

This error typically means:
- Your OAuth credentials are incorrect
- The redirect URI doesn't match what's configured in Google Cloud Console
- The OAuth consent screen is not properly configured

**Solution:**
1. Double-check all credentials in your `.env` file
2. Verify the redirect URI in Google Cloud Console matches exactly
3. Make sure you've added yourself as a test user in the OAuth consent screen

### "Access blocked: This app's request is invalid"

This means the OAuth consent screen is not properly configured.

**Solution:**
1. Go to "APIs & Services" > "OAuth consent screen"
2. Add the required scopes: `https://www.googleapis.com/auth/drive.file`
3. Add yourself as a test user
4. Save and try again

### "Refresh token is invalid"

The refresh token may have expired or been revoked.

**Solution:**
1. Follow Step 4 again to generate a new refresh token
2. Update your `.env` file with the new token
3. Restart your server

### "Insufficient Permission"

The refresh token doesn't have the right permissions.

**Solution:**
1. When generating the refresh token, make sure to select the correct scope: `https://www.googleapis.com/auth/drive.file`
2. Regenerate the refresh token with the correct scope

## Security Best Practices

1. **Environment Variables**: Never commit your `.env` file to version control
2. **Refresh Token**: Treat your refresh token like a password - it grants access to your Google Drive
3. **OAuth Consent Screen**: In production, consider publishing your OAuth consent screen for a better user experience
4. **Folder Permissions**: Only share the backup folder with trusted users
5. **Periodic Review**: Regularly review authorized apps in your Google Account security settings

## Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)
