import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function getPrescriptionUploadUrl(userId: string, fileName: string, fileType: string) {
  const key = `prescriptions/${userId}/${Date.now()}-${fileName}`;
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET || 'medbridge-prescriptions',
    Key: key,
    ContentType: fileType,
  });

  // 10 minute valid presigned URL
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
  return { uploadUrl, fileKey: key };
}
