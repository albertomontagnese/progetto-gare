import { Storage } from '@google-cloud/storage';

let storage: Storage;

function getStorage(): Storage {
  if (storage) return storage;
  const b64Key = process.env.GOOGLE_PRIVATE_KEY_BASE64;
  let privateKey = '';
  if (b64Key) {
    privateKey = Buffer.from(b64Key, 'base64').toString('utf8');
  } else {
    privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL!,
      private_key: privateKey,
    },
  });
  return storage;
}

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME || 'progetto-gare-uploads';
  return getStorage().bucket(bucketName);
}

/**
 * Upload a file buffer to GCS.
 * Returns the GCS path (object name) for later retrieval.
 */
export async function uploadFile(
  buffer: Buffer,
  objectName: string,
  contentType?: string
): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(objectName);
  await file.save(buffer, {
    contentType: contentType || 'application/octet-stream',
    resumable: false,
  });
  return objectName;
}

/**
 * Try to upload to GCS; return null on failure instead of throwing.
 */
export async function tryUploadFile(
  buffer: Buffer,
  objectName: string,
  contentType?: string
): Promise<string | null> {
  try {
    return await uploadFile(buffer, objectName, contentType);
  } catch (err) {
    console.warn(`[GCS] Upload failed for ${objectName}:`, (err as Error).message);
    return null;
  }
}

/**
 * Download a file from GCS and return it as a Buffer.
 */
export async function downloadFile(objectName: string): Promise<Buffer> {
  const bucket = getBucket();
  const [buffer] = await bucket.file(objectName).download();
  return buffer;
}

/**
 * Try download; return null on failure.
 */
export async function tryDownloadFile(objectName: string): Promise<Buffer | null> {
  try {
    return await downloadFile(objectName);
  } catch (err) {
    console.warn(`[GCS] Download failed for ${objectName}:`, (err as Error).message);
    return null;
  }
}

/**
 * Generate a signed URL for temporary access.
 */
export async function getSignedUrl(
  objectName: string,
  expiresInMinutes = 60
): Promise<string> {
  const bucket = getBucket();
  const [url] = await bucket.file(objectName).getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60_000,
  });
  return url;
}

/**
 * Delete a file from GCS.
 */
export async function deleteFile(objectName: string): Promise<void> {
  const bucket = getBucket();
  await bucket.file(objectName).delete({ ignoreNotFound: true });
}

/**
 * List files under a prefix.
 */
export async function listFiles(prefix: string): Promise<string[]> {
  const bucket = getBucket();
  const [files] = await bucket.getFiles({ prefix });
  return files.map((f) => f.name);
}
