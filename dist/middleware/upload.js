"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.UPLOAD_DIR || './uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const fileFilter = (req, file, cb) => {
    // Allow various diagram and image formats
    const allowedExtensions = /jpeg|jpg|png|gif|svg|webp|drawio|xml|pdf|vsdx/;
    const allowedMimeTypes = /image\/.*|application\/pdf|application\/xml|text\/xml|application\/vnd\.ms-visio\.drawing/;
    const extname = allowedExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.test(file.mimetype);
    // Special case for draw.io files which might have various MIME types
    const isDrawioFile = file.originalname.toLowerCase().endsWith('.drawio') ||
        file.originalname.toLowerCase().endsWith('.xml') ||
        (file.mimetype === 'application/xml' || file.mimetype === 'text/xml');
    if (mimetype && extname || isDrawioFile) {
        return cb(null, true);
    }
    else {
        cb(new Error('Supported formats: Images (JPEG, PNG, GIF, SVG, WebP), Draw.io files (.drawio, .xml), PDF, Visio (.vsdx)'));
    }
};
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
    },
    fileFilter: fileFilter
});
//# sourceMappingURL=upload.js.map