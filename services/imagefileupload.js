import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if(file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'), false);
    }
};

const upload = multer({
    storage : storage,
    fileFilter : fileFilter,
    limits: {fileSize: 2 * 1024 * 1024 }
});

export default upload;
