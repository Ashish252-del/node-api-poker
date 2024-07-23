const multer = require('multer');
const AWS = require("aws-sdk");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const process = require('process');
const dotenv = require("dotenv");
dotenv.config();
const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID, // store it in .env file to keep it safe
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    region: process.env.AWS_REGION // this is the region that you select in AWS account
})
const s3Storage = multerS3({
    s3: s3, // s3 instance
    bucket: process.env.AWS_BUCKET_NAME, // change it as per your project requirement
    metadata: (req, file, cb) => {
        cb(null, {fieldname: file.fieldname})
    },
    key: (req, file, cb) => {
        const fileName = Date.now() + "_" + file.fieldname + "_" + file.originalname;
        cb(null, fileName);
    }
});
const upload = multer({ storage: s3Storage });

module.exports = {
    upload
}
