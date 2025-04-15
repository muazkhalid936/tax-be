const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "uploads/certificates");
	},
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
});

const fileFilter = (req, file, cb) => {
	const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
	if (!allowedTypes.includes(file.mimetype)) {
		return cb(new Error("Only PDFs, JPEGs, and PNGs are allowed"), false);
	}
	cb(null, true);
};

const upload = multer({
	storage: storage,
	fileFilter: fileFilter,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file limit
});

module.exports = upload;
