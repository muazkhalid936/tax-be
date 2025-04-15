const mongoose = require("mongoose");

const payment_termSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			validate: {
				validator: async function (value) {
					const user = await mongoose.model("User").findById(value);
					return user && user.businessType === "customer";
				},
				message: (props) => `${props.value} is not a valid customer.`,
			},
		},
		supplier: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: false,
			validate: {
				validator: async function (value) {
					if (!value) return true; // If supplier is not provided
					const user = await mongoose.model("User").findById(value);
					return user && user.businessType === "supplier";
				},
				message: (props) => `${props.value} is not a valid supplier.`,
			},
		},
		general: { type: Boolean, default: false }, // True for General Proposal
		paymentMode: {
			type: String,
			enum: ["advance", "credit", "pdc", "advance_pdc", "lc"],
			required: true,
		},
		shipmentTerms: { type: String, required: true },
		businessConditions: {
			type: String,
			enum: ["efs", "gst", "non_gst"],
			required: true,
		},
		supplierShipmentTerms: { type: String },
		supplierBusinessConditions: {
			type: String,
			enum: ["efs", "gst", "non_gst"],
		},
		supplierEndDate: { type: Date },
		status: {
			type: String,
			enum: [
				"proposal_sent_received",
				"proposal_replied",
				"contract_sent_received",
				"contracted",
				"renew_requested_received",
			],
		},
		days: { type: Number, required: true },
		endDate: {
			type: Date,
			validate: {
				validator: function (value) {
					if (this.general) {
						return !value;
					}
					return value > new Date();
				},
				message: (props) => {
					if (this.general) {
						return "endDate must not be provided when general is true.";
					}
					return `${props.value} is not a valid date. It must be greater than the current date.`;
				},
			},
		},
		revisions: [
			{
				revisionNo: { type: Number },
				revisionDate: { type: Date, default: Date.now },
				paymentMode: { type: String },
				shipmentTerms: { type: String },
				businessConditions: { type: String },
				status: { type: String },
				supplierShipmentTerms: { type: String },
				supplierBusinessConditions: { type: String },
				supplierEndDate: { type: Date },
				days: { type: Number },
				endDate: { type: Date },
			},
		],
		revision: { type: Number, default: 0 },
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// Pre-save hook to update revision fields automatically
payment_termSchema.pre("save", function (next) {
	if (this.isModified("revisions")) {
		// Automatically set the revision number based on the length of revisions
		this.revision = this.revisions.length;
		const newRevisionNo = this.revision + 1;

		// Set revisionNo for the new revision
		this.revisions[this.revisions.length - 1].revisionNo = newRevisionNo;
	}
	next();
});

// Create a compound index to ensure uniqueness between userId and supplier
payment_termSchema.index({ userId: 1, supplier: 1 }, { unique: true });

module.exports = mongoose.model("SupplyChain", payment_termSchema);
