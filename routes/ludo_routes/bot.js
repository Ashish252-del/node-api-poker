const express = require("express");
const router = express.Router();
const botController= require("../../controllers/ludo_controllers/bot/bot.controller")
const multer = require("multer");
const { memoryStorage } = require("multer");

const storage = memoryStorage();
const upload = multer({ storage });

const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

// create s3 instance using S3Client
// (this is how we create s3 instance in v3)
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
const uploadImage = multer({
    storage: s3Storage,
})
//= ===============================
// API routes
//= ===============================

router.post("/add", uploadImage.single("image"),botController.addBot)
router.get("/get",botController.getBot)
router.get("/getAll",botController.getBots)
router.put("/updateBot",botController.updateBot)
router.delete("/deleteBot",botController.deleteBot)
router.get("/getBotById",botController.getBotById)

module.exports = router;
