import { Storage } from '@google-cloud/storage';

let storage: Storage;

function getStorage(): Storage {
  if (storage) return storage;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
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
 * Download a file from GCS and return it as a Buffer.
 */
export async function downloadFile(objectName: string): Promise<Buffer> {
  const bucket = getBucket();
  const [buffer] = await bucket.file(objectName).download();
  return buffer;
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

/**
 * Ensure the GCS bucket exists and create it if not.
 */
export async function ensureBucket(): Promise<void> {
  const bucket = getBucket();
  const [exists] = await bucket.exists();
  if (!exists) {
    await getStorage().createBucket(bucket.name, {
      location: 'EU',
      storageClass: 'STANDARD',
    });
  }
}
