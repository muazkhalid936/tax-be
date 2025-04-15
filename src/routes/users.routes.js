const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const {
	updateProfile,
	getSuppliers,
	listSuppliers
} = require("../controllers/users.contorller");

router.get(
	"/suppliers",
	protect(["customer"]),
	getSuppliers
);

router.put(
	"/profile",
	protect(),
	upload.array("certificates", 4),
	updateProfile
);

module.exports = router;
