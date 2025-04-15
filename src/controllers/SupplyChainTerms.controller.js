const SupplyChain = require("../models/supplyChainTerm.model");
const User = require("../models/user.model");

// Get all PaymentTerms For debugging purposes
const getAllSupplyChains = async (req, res) => {
	try {
		const supplyChain = await SupplyChain.find();
		res.status(200).json({ supplyChain });
	} catch (error) {
		res.status(500).json({ message: "Error getting payment terms.", error });
	}
};

const getAllNewSupplyChainProposals = async (req, res) => {
	try {
		const { userId } = req.params;

		if (!userId) {
			return res.status(400).json({ message: "Invalid user ID." });
		}

		const supplyChain = await SupplyChain.find({
			$or: [{ userId: userId }, { supplier: userId }],
			$and: [{ general: false }],
		})
			.populate("supplier", "name _id")
			.populate("userId", "name _id");

		res.status(200).json(supplyChain);
	} catch (error) {
		res.status(500).json({ message: "Error getting payment terms.", error });
	}
};

// Get General PaymentTerm
const getGeneralSupplyChainTerms = async (req, res) => {
	try {
		const { userId } = req.params;

		if (!userId) {
			return res.status(400).json({ message: "Invalid user ID." });
		}

		const generalTerms = await SupplyChain.findOne({
			userId,
			general: true,
		});
		if (!generalTerms) {
			return res.status(200).json(null);
		}

		res.status(200).json(generalTerms);
	} catch (error) {
		res
			.status(500)
			.json({ message: "Error getting general payment Term.", error });
	}
};

// Create General PaymentTerm
const createGeneralSupplyChainTerm = async (req, res) => {
	try {
		const { userId, paymentMode, shipmentTerms, businessConditions, days } =
			req.body;

		// Check if userId is provided
		if (!userId) {
			return res.status(400).json({ message: "User ID is required." });
		}

		// Check if a general proposal already exists for this user
		const existingProposal = await SupplyChain.findOne({
			userId,
			general: true,
		});

		if (existingProposal) {
			return res
				.status(400)
				.json({ message: "General Proposal already exists." });
		}

		const supplyChainTerm = new SupplyChain({
			userId,
			general: true,
			paymentMode,
			shipmentTerms,
			businessConditions,
			days,
		});

		await supplyChainTerm.save();

		res.status(201).json({
			message: "General supply chain term created successfully.",
			supplyChainTerm,
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: "Error creating general supply chain term.", error });
	}
};

// update the general PaymentTerm
const updateGeneralSupplyChainTerm = async (req, res) => {
	try {
		const { paymentMode, shipmentTerms, businessConditions, days } = req.body;
		const { generalTermId } = req.params;

		if (
			generalTermId === "undefined" ||
			generalTermId === null ||
			!generalTermId ||
			!paymentMode ||
			!shipmentTerms ||
			!businessConditions ||
			!days
		) {
			return res.status(400).json({ message: "Invalid request." });
		}

		const generalTerm = await SupplyChain.findById(generalTermId);
		if (!generalTerm) {
			return res.status(404).json({ message: "General Term not found." });
		}

		generalTerm.paymentMode = paymentMode;
		generalTerm.shipmentTerms = shipmentTerms;
		generalTerm.businessConditions = businessConditions;
		generalTerm.days = days;
		await generalTerm.save();

		res.status(200).json({
			message: "General Term updated successfully.",
			generalTerm,
		});
	} catch (error) {
		res.status(500).json({ message: "Error updating general Term.", error });
	}
};

// Create New PaymentTerm
const createNewSupplyChainTerm = async (req, res) => {
	try {
		const {
			userId,
			supplier,
			paymentMode,
			shipmentTerms,
			businessConditions,
			days,
			endDate,
		} = req.body;

		if (supplier) {
			const user = await User.findById(supplier);
			if (!user || user.businessType !== "supplier") {
				return res.status(400).json({ message: "Invalid supplier." });
			}

			const existingProposal = await SupplyChain.findOne({ userId, supplier });
			if (existingProposal) {
				return res
					.status(400)
					.json({ message: "Proposal already exists with this supplier." });
			}
		}

		const supplyChainTerm = new SupplyChain({
			userId,
			supplier,
			paymentMode,
			shipmentTerms,
			businessConditions,
			days,
			endDate,
			status: "proposal_sent_received",
		});

		await supplyChainTerm.save();
		res.status(201).json({
			message: "New payment term created successfully.",
			supplyChainTerm,
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: "Error creating new payment Term.", error });
	}
};

// Renew Payment Term
const renewSupplyChainTerm = async (req, res) => {
	try {
		const {
			paymentTermId,
			newEndDate,
			paymentMode,
			shipmentTerms,
			businessConditions,
			days,
		} = req.body;

		// Find the existing payment term
		const paymentTerm = await SupplyChain.findById(paymentTermId);
		if (!paymentTerm) {
			return res.status(404).json({ message: "Payment Term not found." });
		}

		// Add the new revision to the revisions array
		paymentTerm.revisions.push({
			paymentMode: paymentTerm.paymentMode,
			shipmentTerms: paymentTerm.shipmentTerms,
			businessConditions: paymentTerm.businessConditions,
			status: paymentTerm.status,
			supplierShipmentTerms: paymentTerm.supplierShipmentTerms,
			supplierBusinessConditions: paymentTerm.supplierBusinessConditions,
			supplierEndDate: paymentTerm.supplierEndDate,
			days: paymentTerm.days,
			endDate: paymentTerm.endDate,
		});

		// Update the fields with new values
		paymentTerm.endDate = newEndDate;
		paymentTerm.paymentMode = paymentMode;
		paymentTerm.shipmentTerms = shipmentTerms;
		paymentTerm.businessConditions = businessConditions;
		paymentTerm.days = days;
		paymentTerm.status = "renew_requested_received"; // Status of the renewal

		// Save the updated payment term document
		await paymentTerm.save();

		// Send the response with the updated payment term
		res
			.status(200)
			.json({ message: "Payment Term renewed successfully.", paymentTerm });
	} catch (error) {
		// Handle errors
		res.status(500).json({ message: "Error renewing payment term.", error });
	}
};

const replyToSupplyChainTerm = async (req, res) => {
	try {
		const {
			proposalId,
			supplierId,
			customerId,
			supplierShipmentTerms,
			supplierBusinessConditions,
			supplierEndDate,
		} = req.body;

		// Validate required fields
		if (!proposalId || !supplierId || !customerId) {
			return res.status(400).json({ message: "Invalid request." });
		}

		// Check if customer exists
		const user = await User.findOne({
			_id: customerId,
			businessType: "customer",
		});
		if (!user) {
			return res.status(400).json({ message: "Invalid User." });
		}

		// Check if supplier exists
		const supplier = await User.findOne({
			_id: supplierId,
			businessType: "supplier",
		});
		if (!supplier) {
			return res.status(400).json({ message: "Invalid Supplier." });
		}

		// Find the payment term
		const paymentTerm = await SupplyChain.findOne({
			_id: proposalId,
			userId: customerId,
			supplier: supplierId,
		});

		if (!paymentTerm) {
			return res.status(404).json({ message: "Payment Term not found." });
		}

		// Update the payment term fields
		paymentTerm.supplierShipmentTerms = supplierShipmentTerms;
		paymentTerm.supplierBusinessConditions = supplierBusinessConditions;
		paymentTerm.supplierEndDate = supplierEndDate;
		paymentTerm.status = "proposal_replied";

		// Save the updated payment term
		await paymentTerm.save();

		res
			.status(200)
			.json({ message: "Payment Term replied successfully.", paymentTerm });
	} catch (error) {
		res.status(500).json({ message: "Error replying to payment Term.", error });
	}
};

// Accept Contract
const acceptContract = async (req, res) => {
	try {
		const { contractId, supplierId, customerId } = req.body;

		if (!contractId || !supplierId || !customerId) {
			return res.status(400).json({ message: "Invalid request." });
		}

		const user = await User.findOne({
			_id: customerId,
			businessType: "customer",
		});
		if (!user) {
			return res.status(400).json({ message: "Invalid User." });
		}

		const supplier = await User.findOne({
			_id: supplierId,
			businessType: "supplier",
		});
		if (!supplier) {
			return res.status(400).json({ message: "Invalid Supplier." });
		}

		const contract = await SupplyChain.findById(contractId);
		if (!contract) {
			return res.status(404).json({ message: "Payment Term not found." });
		}

		contract.status = "contracted";
		await contract.save();

		res
			.status(200)
			.json({ message: "Contract accepted successfully.", contract });
	} catch (error) {
		res.status(500).json({ message: "Error accepting contract.", error });
	}
};

// Get all users
const getAllUsers = async (req, res) => {
	try {
		const users = await User.find();
		res.status(200).json({ users });
	} catch (error) {
		res.status(500).json({ message: "Error getting users.", error });
	}
};

// Exporting the controller functions
module.exports = {
	getAllUsers,
	getAllSupplyChains,
	getAllNewSupplyChainProposals,
	getGeneralSupplyChainTerms,
	createGeneralSupplyChainTerm,
	updateGeneralSupplyChainTerm,
	createNewSupplyChainTerm,
	renewSupplyChainTerm,
	replyToSupplyChainTerm,
	acceptContract,
};
