import { google } from 'googleapis'

// Initialize OAuth2 client for Google Drive API
function getOAuth2Client() {
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

/**
 * Download a backup file from Google Drive as a Buffer
 */
export async function downloadBackupFromDrive(fileId: string): Promise<Buffer> {
  const drive = getDriveClient()

  const response = await drive.files.get(
    {
      fileId,
      alt: 'media',
    },
    {
      responseType: 'arraybuffer',
    }
  )

  return Buffer.from(response.data as ArrayBuffer)
}

// Helper function to convert Buffer to ReadableStream
function bufferToStream(buffer: Buffer) {
  const { Readable } = require('stream')
  const readable = new Readable()
  readable.push(buffer)
  readable.push(null)
  return readable
}
