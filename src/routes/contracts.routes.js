const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const {
	sendContract,
	getContractById,
	getAllUserContracts,
	getAllNewUserContracts,
	acceptContract,
	getAllRunningUserContracts,
	getAllCompletedUserContracts,
	getAllBlockBookingUserContracts,
	createMonthlyPlans,
	getMonthlyPlansForContract,
	updateContractStatus,
	getAllContractStats
} = require("../controllers/contract.controller");

router.get("/detail", protect(["supplier", "customer"]), getContractById);
router.get(
	"/all",
	protect(["supplier", "customer"]),
	getAllUserContracts
);
router.get(
	"/running",
	protect(["supplier", "customer"]),
	getAllRunningUserContracts
);
router.get(
	"/completed/:userId",
	protect(["supplier", "customer"]),
	getAllCompletedUserContracts
);
router.get(
	"/blockbooking",
	protect(["supplier", "customer"]),
	getAllBlockBookingUserContracts
);
router.get(
	"/new/:userId",
	protect(["supplier", "customer"]),
	getAllNewUserContracts
);

router.post("/accept/:id", protect(["customer"]), acceptContract);


router.post("/customer/monthly-plans", protect(["customer"]), createMonthlyPlans);
router.get("/customer/:contractId/monthly-plans", protect(["customer"]), getMonthlyPlansForContract);
router.post("/create", protect(["supplier"]), sendContract);
router.put("/update", protect(["customer, supplier"]), updateContractStatus);
router.get("/stats",protect(["admin","customer", "supplier"]), getAllContractStats);


module.exports = router;
