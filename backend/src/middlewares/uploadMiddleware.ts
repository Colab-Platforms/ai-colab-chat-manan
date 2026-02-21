import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(process.cwd(), "public/uploads/attachments"));
    },
    filename: (_req, file, cb) => {
        cb(null, `${uuidv4()}-${file.originalname}`);
    },
});

export const uploadAttachment = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
