import {
  S3Client
} from "@aws-sdk/client-s3";

const endpoint =
  process.env.S3_ENDPOINT;

const region =
  process.env.S3_REGION;

const accessKeyId =
  process.env.S3_ACCESS_KEY;

const secretAccessKey =
  process.env.S3_SECRET_KEY;

if (
  !endpoint
  || !region
  || !accessKeyId
  || !secretAccessKey
) {
  throw new Error(
    "Не заданы параметры подключения к Object Storage"
  );
}

export const s3Client =
  new S3Client({
    endpoint,

    region,

    credentials: {
      accessKeyId,
      secretAccessKey
    },

    forcePathStyle:
      false
  });