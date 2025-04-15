const express = require("express");
const { protect } = require("../middleware/auth.middleware");

const authRoutes = require("./auth.routes");
const userRoutes = require("./users.routes");
const supplyChainRoutes = require("./supplyChainTerms.routes");
const generalInquiryRoutes = require("./general/generalInquiry.routes");
const generalProposalRoutes = require("./general/generalProposal.routes");
const blockBookingInquiryRoutes = require("./blockBooking/blockBookingInquiry.routes");
const blockBookingProposalRoutes = require("./blockBooking/blockBookingProposal.routes");
const contractRoutes = require("./contracts.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/payment-terms", supplyChainRoutes);
router.use("/contracts", contractRoutes);

// general routes
router.use("/general/inquiry", generalInquiryRoutes);
router.use("/general/proposals", generalProposalRoutes);

// block booking routes
router.use("/block-booking/inquiry", blockBookingInquiryRoutes);
router.use("/block-booking/proposals", blockBookingProposalRoutes);


module.exports = router;
