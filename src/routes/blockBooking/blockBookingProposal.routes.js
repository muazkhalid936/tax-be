const express = require("express");
const router = express.Router();
const blockBookingProposalController = require("../../controllers/blockBooking/proposal.controller");
const { protect } = require("../../middleware/auth.middleware");

router.post("/create", protect(["supplier"]), blockBookingProposalController.createProposal);

router.get("/", protect(["customer","supplier"]), blockBookingProposalController.getProposals);

router.get("/:inquiryId", blockBookingProposalController.getProposalDetails);

router.get("/inquiryProposals/:inquiryId", blockBookingProposalController.getInquiryProposals);

router.post("/:proposalId/accept", protect(["customer"]), blockBookingProposalController.acceptProposal);



module.exports = router;
