import { google } from 'googleapis'

/**
 * Validate that all required Google Drive environment variables are configured
 */
function validateGoogleDriveConfig(): { valid: boolean; missingVars: string[] } {
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_DRIVE_FOLDER_ID',
  ]

  const missingVars = requiredVars.filter(
    (varName) => !process.env[varName] || process.env[varName] === '' || process.env[varName] === 'your-google-client-id' || process.env[varName]?.startsWith('your-')
  )

  return {
    valid: missingVars.length === 0,
    missingVars,
  }
}

// Initialize OAuth2 client for Google Drive API
function getOAuth2Client() {
  // Validate configuration before creating client
  const { valid, missingVars } = validateGoogleDriveConfig()

  if (!valid) {
    throw new Error(
      `Google Drive is not configured. Missing or invalid environment variables: ${missingVars.join(', ')}. ` +
      'Please set up Google Drive OAuth credentials in your .env file. ' +
      'See GOOGLE_DRIVE_SETUP.md for instructions.'
    )
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })

  return oauth2Client
}

// Get Google Drive instance
function getDriveClient() {
  const auth = getOAuth2Client()
  return google.drive({ version: 'v3', auth })
}

/**
 * Upload a backup file to Google Drive
 */
export async function uploadBackupToDrive(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const drive = getDriveClient()
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured')
  }

  // Create file metadata
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  }

  // Create media
  const media = {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    body: bufferToStream(buffer),
  }

  // Upload file
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink',
  })

  if (!response.data.id) {
    throw new Error('Failed to upload file to Google Drive')
  }

  return response.data.id
}

/**
 * List recent backups from Google Drive
 */
export async function listBackupsFromDrive(limit: number = 10) {
  const drive = getDriveClient()
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured')
  }

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, createdTime, size, webViewLink)',
    orderBy: 'createdTime desc',
    pageSize: limit,
  })

  return response.data.files || []
}

/**
 * Delete a backup file from Google Drive
 */
export async function deleteBackupFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.files.delete({ fileId })
}

/**
 * Get backup file download URL
 */
export async function getBackupDownloadUrl(fileId: string): Promise<string> {
  const drive = getDriveClient()

  const response = await drive.files.get({
    fileId,
    fields: 'webContentLink',
  })

  return response.data.webContentLink || ''
}

// Helper function to convert Buffer to ReadableStream
function bufferToStream(buffer: Buffer) {
  const { Readable } = require('stream')
  const readable = new Readable()
  readable.push(buffer)
  readable.push(null)
  return readable
}
