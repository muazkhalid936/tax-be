const express = require('express');
const router = express.Router();
const { createGeneralProposals, getProposals, acceptGeneralProposal, getInquiryProposals } = require('../../controllers/general/proposal.controller');
const { protect } = require("../../middleware/auth.middleware");

router.get('/', protect(["customer", "supplier"]), getProposals);
router.post('/create',protect(["supplier"]) ,createGeneralProposals);
router.post('/:proposalId/accept', protect(["customer"]), acceptGeneralProposal);
router.get("/:inquiryId", protect(["customer", "supplier"]), getInquiryProposals);

module.exports = router;
