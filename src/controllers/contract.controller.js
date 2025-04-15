const { default: mongoose } = require("mongoose");
const Contract = require("../models/contract.model");
const GeneralProposal = require("../models/general/proposal.model");
const BlockBookingProposal = require("../models/blockBooking/proposal.model");

// Function to send (create) a new contract
const sendContract = async (req, res) => {
	const currentYear = new Date(Date.now()).getFullYear();
	try {
		const supplierId = req.user.id
		const {
			contractDate,
			contractType,
			customerId,
			description,
			poNumber,
			soNumber,
			specs,
			coneWeight,
			rate,
			quantity,
			balance,
			startDate,
			endDate,
			status,
			customerName,
			aging,
			// terms,
			// soDocument (optional, if handling file uploads)
		} = req.body;

		if (contractType === "block-booking" && !req.body.allocationNumber) {
			return res.status(400).json({
				message: "Allocation number is required for block-booking contracts",
			});
		}

		const contract = new Contract({
			contractDate,
			contractType,
			supplierId,
			customerId,
			description,
			poNumber,
			soNumber,
			specs,
			coneWeight,
			rate,
			quantity,
			balance,
			startDate,
			endDate,
			status,
			customerName,
			aging,
			contractStatus: "contract_sent_rcvd",
			...(contractType === "block-booking" && {
				allocationNumber: req.body.allocationNumber,
			}),
			// soDocument: req.body.soDocument, // optional, if uploading
		});

		contract.contractNumber = `Textilia-${contract.id}/${currentYear}`

		const ProposalModel =
			contract.contractType === "general"
				? mongoose.model("GeneralProposal")
				: mongoose.model("BlockBookingProposal");

		const updatePromises = contract.description.map(async (proposalId) => {
			const proposal = await ProposalModel.findById(proposalId);
			if (proposal) {
				proposal.status = "contract_sent";
				return proposal.save();
			}
		});

		await Promise.all(updatePromises);
		await contract.save();

		res.status(201).json({
			message: "Contract created successfully",
			contract,
		});
	} catch (error) {
		res.status(400).json({
			message: "Failed to create contract",
			error: error.message,
		});
	}
};

const updateContractStatus = async (req, res) => {
	const statuses = ["gen_running",
        "gen_completed",
        "block_running",
        "block_completed",
        "cancelled",
        "closed",
        "paused",]
	try {
		const { id } = req.query
		const { status, reason } = req.body
		const userId = req.user.id
		if(!(status.includes(statuses))){
			return res.status(400).json({
				status: false,
				message: "invalid status"
			})
		}
		const contract = await Contract.findById(id)
		if(userId !== contract.supplierId || userId !== contract.customerId ){
			return res.status(401).json({
				status: false,
				message: "Unauthorized"
			})
		}
		contract.status = status
		if(reason){
			contract.reason = reason
		}
		contract.save()
		return res.status(200).json({
			status: true,
			message: "Contract status updated successfully"
		})
	} catch (error) {
		res.status(500).json({
			status: false,
			message: "Internal Server error"
		})
	}
}

const getAllContractStats = async (req, res) => {
	try {
		const userRole = req.user.businessType;

		let contractStatsGenRunning = 0;
		let contractStatsGenCompleted = 0;
		let contractStatsGenClosed = 0;
		let contractStatsGenPaused = 0;
		let contractStatsGenCancelled = 0;

		let contractStatsBlockRunning = 0;
		let contractStatsBlockCompleted = 0;
		let contractStatsBlockClosed = 0;
		let contractStatsBlockPaused = 0;
		let contractStatsBlockCancelled = 0;

		if (userRole === "admin") {
			// Return all stats for admin
			contractStatsGenRunning = await Contract.countDocuments({ status: "gen_running", contractType: "general" });
			contractStatsGenCompleted = await Contract.countDocuments({ status: "gen_completed", contractType: "general" });
			contractStatsGenClosed = await Contract.countDocuments({ status: "closed", contractType: "general" });
			contractStatsGenPaused = await Contract.countDocuments({ status: "paused", contractType: "general" });
			contractStatsGenCancelled = await Contract.countDocuments({ status: "cancelled", contractType: "general" });

			contractStatsBlockRunning = await Contract.countDocuments({ status: "block_running", contractType: "block-booking" });
			contractStatsBlockCompleted = await Contract.countDocuments({ status: "block_completed", contractType: "block-booking" });
			contractStatsBlockClosed = await Contract.countDocuments({ status: "closed", contractType: "block-booking" });
			contractStatsBlockPaused = await Contract.countDocuments({ status: "paused", contractType: "block-booking" });
			contractStatsBlockCancelled = await Contract.countDocuments({ status: "cancelled", contractType: "block-booking" });
		} else {
			// Determine which field to use based on user role
			const userField = userRole === "supplier" ? "supplierId" : "customerId";

			const stats = await Contract.aggregate([
				{
					$lookup: {
						from: "users",
						localField: userField,
						foreignField: "_id",
						as: "user"
					}
				},
				{ $unwind: "$user" },
				{ $match: { "user.businessType": userRole } },
				{
					$group: {
						_id: { contractType: "$contractType", status: "$status" },
						count: { $sum: 1 }
					}
				}
			]);

			// Map results to variables
			stats.forEach(stat => {
				const { contractType, status } = stat._id;
				const count = stat.count;

				if (contractType === "general") {
					if (status === "gen_running") contractStatsGenRunning = count;
					else if (status === "gen_completed") contractStatsGenCompleted = count;
					else if (status === "closed") contractStatsGenClosed = count;
					else if (status === "paused") contractStatsGenPaused = count;
					else if (status === "cancelled") contractStatsGenCancelled = count;
				} else if (contractType === "block-booking") {
					if (status === "block_running") contractStatsBlockRunning = count;
					else if (status === "block_completed") contractStatsBlockCompleted = count;
					else if (status === "closed") contractStatsBlockClosed = count;
					else if (status === "paused") contractStatsBlockPaused = count;
					else if (status === "cancelled") contractStatsBlockCancelled = count;
				}
			});
		}

		return res.status(200).json({
			status: true,
			message: "Data found",
			general: {
				running: contractStatsGenRunning,
				completed: contractStatsGenCompleted,
				closed: contractStatsGenClosed,
				paused: contractStatsGenPaused,
				cancelled: contractStatsGenCancelled
			},
			block_booking: {
				running: contractStatsBlockRunning,
				completed: contractStatsBlockCompleted,
				closed: contractStatsBlockClosed,
				paused: contractStatsBlockPaused,
				cancelled: contractStatsBlockCancelled
			},
			total: {
				running: contractStatsGenRunning + contractStatsBlockRunning,
				completed: contractStatsGenCompleted + contractStatsBlockCompleted,
				closed: contractStatsGenClosed + contractStatsBlockClosed,
				paused: contractStatsGenPaused + contractStatsBlockPaused,
				cancelled: contractStatsGenCancelled + contractStatsBlockCancelled
			}
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: false,
			message: "Internal Server Error"
		});
	}
};


// Function to get a contract by its ID
const getContractById = async (req, res) => {
	try {
		const { id } = req.query;
		const contract = await Contract.findById(id)
			.populate("supplierId customerId description")
			.exec();

		if (!contract) {
			return res.status(404).json({ message: "Contract not found" });
		}
		res.status(200).json(contract);
	} catch (error) {
		res
			.status(500)
			.json({ message: "Error retrieving contract", error: error.message });
	}
};

const getAllUserContracts = async (req, res) => {
	try {
		const { user_id } = req.query;

		// Query to find contracts for the user, excluding specific statuses
		const contracts = await Contract.find({
			contractStatus: { $ne: "contract_sent_rcvd" },
			$or: [{ supplierId: user_id }, { customerId: user_id }],
		})
			.populate("supplierId customerId", "name")
			.populate({
				path: "description",
				populate: {
					path: "inquiryId",
				},
			})
			.exec();

		const statuses = [
			"contract_sent",
			"contract_accepted",
			"contract_running",
			"delivered",
		];

		// Process and filter the contracts
		const updatedContracts = contracts.map((contract) => {
			const descriptions = Array.isArray(contract.description)
				? contract.description
				: [];

			const filteredDescriptions = descriptions
				.filter((desc) => statuses.includes(desc?.status))
				.map((desc) => ({
					...desc.toObject(),
					inquiryId: desc?.inquiryId,
				}));

			return {
				...contract.toObject(),
				description: filteredDescriptions,
			};
		});

		res.status(200).json(updatedContracts);
	} catch (error) {
		console.error("Error retrieving user contracts:", error);
		res.status(500).json({
			message: "Error retrieving user contracts",
			error: error.message,
		});
	}
};

const getAllRunningUserContracts = async (req, res) => {
	try {
		const { user_id } = req.query;

		// Query to find contracts for the user, excluding specific statuses
		const contracts = await Contract.find({
			status: "running",
			$or: [{ supplierId: user_id }, { customerId: user_id }],
		})
			.populate("supplierId customerId", "name")
			.populate({
				path: "description",
				populate: {
					path: "inquiryId",
				},
			})
			.exec();

		const statuses = ["contract_running"];

		// Process and filter the contracts
		const updatedContracts = contracts.map((contract) => {
			const descriptions = Array.isArray(contract.description)
				? contract.description
				: [];

			const filteredDescriptions = descriptions
				.filter((desc) => statuses.includes(desc?.status))
				.map((desc) => ({
					...desc.toObject(),
					inquiryId: desc?.inquiryId,
				}));

			return {
				...contract.toObject(),
				description: filteredDescriptions,
			};
		});

		res.status(200).json(updatedContracts);
	} catch (error) {
		console.error("Error retrieving user contracts:", error);
		res.status(500).json({
			message: "Error retrieving user contracts",
			error: error.message,
		});
	}
};

// Function to get all new contracts (status: proposal_rcvd, reply_awaited, under_negotiation)
const getAllNewUserContracts = async (req, res) => {
	try {
		const { user_id } = req.query;

		// Fetch contracts whose contratType is not equal to contract_send_rcvd and populate `supplierId`, `customerId`, and `description`
		const contracts = await Contract.find({
			contractStatus: {
				$in: ["contract_sent_rcvd"],
			},
			contractType: "general",
			$or: [{ supplierId: user_id }, { customerId: user_id }],
		})
			.populate("supplierId customerId", "name")
			.populate({
				path: "description",
				populate: "inquiryId",
			})
			.exec();

		// Modify the contracts to include `inquiryId` in the description objects
		const updatedContracts = contracts.map((contract) => {
			const updatedDescriptions = contract.description.map((desc) => ({
				...desc.toObject(), // Convert Mongoose sub-document to plain object
				inquiryId: desc.inquiryId, // Ensure `inquiryId` is explicitly included
			}));

			return {
				...contract.toObject(),
				description: updatedDescriptions,
			};
		});

		res.status(200).json(contracts);
	} catch (error) {
		console.error("Error retrieving user contracts:", error.message);
		res.status(500).json({
			message: "Error retrieving user contracts",
			error: error.message,
		});
	}
};

// Function to get all block booking contracts (status: proposal_rcvd, reply_awaited, under_negotiation)
const getAllBlockBookingUserContracts = async (req, res) => {
	try {
		const { user_id } = req.query;

		// Query to find contracts for the user, excluding specific statuses
		const contracts = await Contract.find({
			status: { $in: ["contract_sent_rcvd"] },
			contractType: "block-booking",
			$or: [{ supplierId: user_id }, { customerId: user_id }],
		})
			.populate("supplierId customerId", "name")
			.populate({
				path: "description",
				populate: {
					path: "inquiryId",
				},
			})
			.exec();

		res.status(200).json(contracts);
	} catch (error) {
		console.error("Error retrieving user contracts:", error);
		res.status(500).json({
			message: "Error retrieving user contracts",
			error: error.message,
		});
	}
};

// Function to get all completed contracts (status: dlvrd, closed)
const getAllCompletedUserContracts = async (req, res) => {
	try {
		const { userId } = req.params;

		// Query to find contracts for the user, excluding specific statuses
		const contracts = await Contract.find({
			contractStatus: "dlvrd",
			$or: [{ supplierId: userId }, { customerId: userId }],
		})
			.populate("supplierId customerId", "name")
			.populate({
				path: "description",
				populate: {
					path: "inquiryId",
				},
			})
			.exec();

		const statuses = ["delivered"];

		// Process and filter the contracts
		const updatedContracts = contracts.map((contract) => {
			const descriptions = Array.isArray(contract.description)
				? contract.description
				: [];

			const filteredDescriptions = descriptions
				.filter((desc) => statuses.includes(desc?.status))
				.map((desc) => ({
					...desc.toObject(),
					inquiryId: desc?.inquiryId,
				}));

			return {
				...contract.toObject(),
				description: filteredDescriptions,
			};
		});

		res.status(200).json(updatedContracts);
	} catch (error) {
		console.error("Error retrieving user contracts:", error);
		res.status(500).json({
			message: "Error retrieving user contracts",
			error: error.message,
		});
	}
};

// Function to get all contracts (For debugging purposes)
const getAllContracts = async (req, res) => {
	try {
		const contracts = await Contract.find()
			.populate("supplierId customerId")
			.exec();
		res.status(200).json(contracts);
	} catch (error) {
		res
			.status(500)
			.json({ message: "Error retrieving contracts", error: error.message });
	}
};

// Function to accept a contract (e.g., change its status to "confirmed")
const acceptContract = async (req, res) => {
	try {
		const { id } = req.params;
		const { customerId, supplierId } = req.body;

		const contract = await Contract.findById(id).populate("description");

		if (!contract) {
			return res.status(404).json({ message: "Contract not found" });
		}

		if (
			customerId !== contract.customerId.toString() ||
			supplierId !== contract.supplierId.toString()
		) {
			return res.status(400).json({ message: "Invalid client or supplier" });
		}

		const ProposalModel =
			contract.contractType === "general"
				? mongoose.model("GeneralProposal")
				: mongoose.model("BlockBookingProposal");

		const updatePromises = contract.description.map(async (proposalId) => {
			const proposal = await ProposalModel.findById(proposalId);
			if (proposal) {
				proposal.status = "contract_running";
				return proposal.save();
			}
		});

		// Wait for all proposals to be updated
		await Promise.all(updatePromises);

		contract.contractStatus = "running";
		await contract.save();

		res
			.status(200)
			.json({ message: "Contract accepted successfully", contract });
	} catch (error) {
		console.error("Error accepting contract:", error.message);
		res.status(500).json({
			message: "Error accepting contract",
			error: error.message,
		});
	}
};

// Function to upload an SO Document
const uploadSODocument = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, path } = req.body;

		const contract = await Contract.findByIdAndUpdate(
			id,
			{ soDocument: { name, path } },
			{ new: true }
		);

		if (!contract) {
			return res.status(404).json({ message: "Contract not found" });
		}
		res
			.status(200)
			.json({ message: "SO Document uploaded successfully", contract });
	} catch (error) {
		res
			.status(400)
			.json({ message: "Error uploading SO Document", error: error.message });
	}
};

const createMonthlyPlans = async (req, res) => {
    const { contracts } = req.body;

    try {
        for (const contractData of contracts) {
            const { contractId, monthlyPlans } = contractData;

            const contract = await Contract.findById(contractId);
            if (!contract) {
                return res.status(404).json({ message: `Contract ${contractId} not found` });
            }

            contract.monthlyPlans.push(
                ...monthlyPlans.map((plan) => ({
                    date: plan.date,
                    quantity: plan.quantity,
                    status: "pending",
                }))
            );

            await contract.save();
			console.log(contract);
        }
        res.status(201).json({ message: "Monthly plans created successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMonthlyPlansForContract = async (req, res) => {
    const { contractId } = req.params;

    try {
        const contract = await Contract.findById(contractId).select("monthlyPlans");
        if (!contract) return res.status(404).json({ message: "Contract not found" });

        res.status(200).json(contract.monthlyPlans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
module.exports = {
	sendContract,
	getContractById,
	getAllUserContracts,
	getAllContracts,
	acceptContract,
	uploadSODocument,
	getAllRunningUserContracts,
	getAllNewUserContracts,
	getAllBlockBookingUserContracts,
	getAllCompletedUserContracts,
	updateContractStatus,
	getAllContractStats,
	createMonthlyPlans,
	getMonthlyPlansForContract
};
