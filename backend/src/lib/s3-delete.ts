import {
  DeleteObjectCommand
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
 * Удаляет файл из Object Storage.
 */
export async function deleteObjectFromStorage(
  objectKey: string
): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket:
        bucket,

      Key:
        objectKey
    })
  );
}