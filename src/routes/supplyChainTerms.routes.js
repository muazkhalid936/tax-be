const express = require("express");
const router = express.Router();
const supplyChainTermsController = require("../controllers/SupplyChainTerms.controller");

router.get("/", supplyChainTermsController.getAllNewSupplyChainProposals); // For debugging purposes
router.get("/users", supplyChainTermsController.getAllUsers); // For debugging purposes
router.get(
	"/users/:userId",
	supplyChainTermsController.getAllNewSupplyChainProposals
);
router.get(
	"/general/:userId",
	supplyChainTermsController.getGeneralSupplyChainTerms
);
router.post(
	"/general",
	supplyChainTermsController.createGeneralSupplyChainTerm
);
router.put(
	"/general/:generalTermId",
	supplyChainTermsController.updateGeneralSupplyChainTerm
);
router.post("/new", supplyChainTermsController.createNewSupplyChainTerm);
router.put("/renew", supplyChainTermsController.renewSupplyChainTerm);
router.put("/reply", supplyChainTermsController.replyToSupplyChainTerm);
router.put("/accept", supplyChainTermsController.acceptContract);

module.exports = router;
