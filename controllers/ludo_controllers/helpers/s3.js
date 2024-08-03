const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const { v4: uuidv4 } = require("uuid");
const s3Configuration = {
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
};
const s3 = new S3Client(s3Configuration);
const BUCKET = process.env.AWS_BUCKET_NAME;

module.exports.uploadToS3 = async (file, userId) => {
  const key = `${userId}/${uuidv4()}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  try {
    await s3.send(command);
    return { key };
  } catch (error) {
    console.log(error);
    return { error };
  }
};

module.exports.getUserPresignedUrls = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    const preSignedUrl = await getSignedUrl(s3, command, {
      expiresIn: 120 * 1000,
    });

    return preSignedUrl;
  } catch (error) {
    return { error };
  }
};


