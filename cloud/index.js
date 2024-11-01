const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require("stream");
require("dotenv").config();

const storage = multer.memoryStorage();
const upload = multer({ storage });

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_KEY,
    api_secret: process.env.CLOUD_SECRET
});

module.exports = {
    cloudinary,
    upload,
    bufferToStream: (buffer) => {
        const readable = new Readable();
        readable._read = () => { };
        readable.push(buffer);
        readable.push(null);
        return readable;
    }
}