const BlockBookingProposal = require("../../models/blockBooking/proposal.model");
const BlockBookingInquiry = require("../../models/blockBooking/inquiry.model");

exports.createProposal = async (req, res) => {
	try {
		const {
			inquiryId,
			countPrices,
			materialCharges,
			certificateUpcharges,
			paymentTerms,
		} = req.body;

		const inquiry = await BlockBookingInquiry.findById(inquiryId);
		if (!inquiry) {
			return res.status(404).json({ message: "Inquiry not found." });
		}

		const existingProposal = await BlockBookingProposal.findOne({
			inquiryId,
			supplierId: req.user.id,
		});

		if (existingProposal) {
			existingProposal.countPrices =
				countPrices || existingProposal.countPrices;
			existingProposal.materialCharges =
				materialCharges || existingProposal.materialCharges;
			existingProposal.certificateUpcharges =
				certificateUpcharges || existingProposal.certificateUpcharges;
			existingProposal.paymentTerms =
				paymentTerms || existingProposal.paymentTerms;

			const updatedProposal = await existingProposal.save();
			return res.status(201).json({
				message: "Proposal updated successfully.",
				proposal: updatedProposal,
			});
		}

		const proposal = new BlockBookingProposal({
			inquiryId,
			supplierId: req.user.id,
			countPrices,
			materialCharges,
			certificateUpcharges,
			paymentTerms,
		});

		const savedProposal = await proposal.save();

		inquiry.status = "proposal_sent";
		await inquiry.save();
		res.status(201).json({
			message: "Proposal created successfully.",
			proposal: savedProposal,
		});
	} catch (error) {
		console.error("Error creating proposal:", error.message);
		res.status(500).json({ error: error.message });
	}
};

exports.getProposals = async (req, res) => {
	try {
		const userId = req.user.id;
		const { businessType } = req.user;
		let proposals = [];

		if (businessType === "customer") {
			const inquiries = await BlockBookingInquiry.find({ customerId: userId })
				.select("_id baseCount quantity quantityType deliveryEndDate targetBasePrice createdAt status aging");

			const inquiryIds = inquiries.map((inquiry) => inquiry._id);

			const proposalCounts = await BlockBookingProposal.aggregate([
				{ $match: { inquiryId: { $in: inquiryIds } } },
				{ $group: { _id: "$inquiryId", count: { $sum: 1 } } },
			]);

			const proposalCountMap = proposalCounts.reduce((map, item) => {
				map[item._id.toString()] = item.count;
				return map;
			}, {});

			proposals = await BlockBookingProposal.find({
				inquiryId: { $in: inquiryIds },
			})
				.select("inquiryId supplierId createdAt status aging")
				.populate("inquiryId", "baseCount quantity quantityType deliveryEndDate targetBasePrice createdAt status aging")
				.populate("supplierId", "name email");

			proposals = proposals.map((proposal) => ({
				...proposal.toObject(),
				proposalCount: proposalCountMap[proposal.inquiryId._id.toString()] || 0,
			}));

		} else if (businessType === "supplier") {
			// Get supplier proposals
			proposals = await BlockBookingProposal.find({ supplierId: userId })
				.select("inquiryId createdAt status aging")
				.populate({
					path: "inquiryId",
					populate: {
						path: "customerId",
						select: "name profile.companyDetails",
					},
				});
		}

		res.status(200).json(proposals);
	} catch (error) {
		console.error("Error fetching proposals:", error.message);
		res.status(500).json({ error: error.message });
	}
};


exports.getProposalDetails = async (req, res) => {
	try {
		const { inquiryId } = req.params;
		// Fetch the proposal
		const proposal = await BlockBookingProposal.findOne({ inquiryId });

		if (!proposal) {
			return res.status(404).json({ message: "Proposal not found." });
		}

		// Check if inquiryId is populated correctly
		if (!proposal.inquiryId) {
			return res
				.status(400)
				.json({ message: "Inquiry details missing in proposal." });
		}

		// Combine inquiry and proposal details
		const response = {
			proposalDetails: proposal,
		};

		res.status(200).json(response);
	} catch (error) {
		console.error("Error fetching proposal details:", error.message);
		res.status(500).json({ error: error.message });
	}
};

exports.getInquiryProposals = async (req, res) => {
	try {
		const { inquiryId } = req.params;

		// Fetch the inquiry
		const inquiry = await BlockBookingInquiry.findById(inquiryId).select(
			"-customerId -__v"
		);
		if (!inquiry) {
			return res.status(404).json({ message: "Inquiry not found." });
		}

		// Fetch all proposals for the given inquiry
		const proposals = await BlockBookingProposal.find({ inquiryId }).populate(
			"supplierId",
			"name email -_id"
		);

		if (!proposals || proposals.length === 0) {
			return res
				.status(404)
				.json({ message: "No proposals found for this inquiry." });
		}

		// Combine inquiry and all proposals
		const response = {
			inquiryDetails: inquiry,
			proposals: proposals,
		};

		res.status(200).json(response);
	} catch (error) {
		console.error("Error fetching inquiry proposals:", error.message);
		res.status(500).json({ error: error.message });
	}
};

exports.acceptProposal = async (req, res) => {
	try {
		const { proposalId } = req.params;

		// Fetch the proposal
		const proposal = await BlockBookingProposal.findById(proposalId);
		if (!proposal) {
			return res.status(404).json({ message: "Proposal not found." });
		}

		const inquiry = await BlockBookingInquiry.findOne({
			_id: proposal.inquiryId,
			status: { $ne: "inquiry_closed" }
		});

		if (!inquiry) {
			return res.status(404).json({ message: "Inquiry not found." });
		}

		inquiry.status = "proposal_accepted";
    	await inquiry.save();
		// Update the status of the proposal
		proposal.status = "proposal_accepted";
		const updatedProposal = await proposal.save();

		res.status(201).json({
			message: "Proposal accepted successfully.",
			proposal: updatedProposal,
		});
	} catch (error) {
		console.error("Error accepting proposal:", error.message);
		res.status(500).json({ error: error.message });
	}
};
