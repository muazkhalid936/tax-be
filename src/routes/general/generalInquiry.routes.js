const express = require("express");
const {
	createGeneralInquiries,
	getInquiries,
	closeInquiry,
	getGeneralInquiryById,
	test
} = require("../../controllers/general/inquiry.controller");
const { protect } = require("../../middleware/auth.middleware");

const router = express.Router();
router.get("/", protect(["customer", "supplier"]), getInquiries);
router.post("/create", protect(["customer"]), createGeneralInquiries);
router.get("/:inquiryId", protect(["customer", "supplier"]), getGeneralInquiryById);
router.post("/close/:inquiryId", protect(["customer"]), closeInquiry);

module.exports = router;
