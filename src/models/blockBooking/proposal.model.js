const mongoose = require("mongoose");

const blockBookingProposalSchema = new mongoose.Schema({
	po: { type: Number },
	inquiryId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "BlockBookingInquiry",
		required: true,
	}, 
	supplierId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	}, 
	countPrices: [
		{
			count: { type: Number, required: true },
			offeredPrice: { type: Number, required: true },
		},
	],
	materialCharges: [
		{
			material: { type: String, required: true },
			offeredUpcharge: { type: Number, required: true },
		},
	],
	certificateUpcharges: [
		{
			certificate: { type: String, required: true },
			offeredUpcharge: { type: Number, required: true },
		},
	],
	paymentTerms: {
		offeredPaymentMode: {
			type: String,
			enum: ["advance", "credit", "pdc", "advance_pdc", "lc"],
			required: true,
		},
		offeredDays: { type: Number, required: true },
		offeredShipmentTerms: { type: String, required: true },
		offeredBusinessConditions: {
			type: String,
			enum: ["efs", "gst", "non_gst"],
			required: true,
		},
	},

	status: {
		type: String,
		enum: [
			"proposal_rejected",
			"inquiry_declined",
			"proposal_sent", // Supplier has responded with a proposal.
			"negotiation", // Inquiry is under negotiation.
			"proposal_accepted", // Customer has accepted the proposal.
			"contract_sent", // Supplier has sent the contract.
			"contract_accepted", // Contract has been accepted by the customer.
			"contract_running", // Contract is currently in progress.
			"delivered", // Items/services under the contract have been delivered.
			"inquiry_closed", // Inquiry has been closed by either party.
		],
		default: "proposal_sent",
	},
	aging: { type: Number, default: 0 },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date },
});

blockBookingProposalSchema.pre("save", function (next) {
	if (this.isModified()) {
		this.updatedAt = new Date();
	}
	next();
});

module.exports = mongoose.model(
	"BlockBookingProposal",
	blockBookingProposalSchema
);
