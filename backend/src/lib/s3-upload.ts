import {
  PutObjectCommand
} from "@aws-sdk/client-s3";

import {
  s3Client
} from "./s3.js";

const bucket =
  process.env.S3_BUCKET;

if (!bucket) {
  throw new Error(
    "Не задана переменная S3_BUCKET"
  );
}

/**
 * Загружает файл в Object Storage.
 */
export async function uploadObjectToStorage(
  objectKey: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket:
        bucket,

      Key:
        objectKey,

      Body:
        body,

      ContentType:
        contentType
    })
  );

  return (
    `https://${bucket}.storage.yandexcloud.net/${objectKey}`
  );
}