const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema(
  {
    contractNumber: { type: String, required: true },
    contractDate: { type: Date, required: true },

    poNumber: { type: String, required: true }, // Added
    soNumber: { type: String, required: true }, // Added
    specs: { type: String, required: true },    // Added
	rate: { type: Number, required: true }, // e.g., price per unit or per pound
    coneWeight: { type: Number, required: true }, // Added (e.g., 0.56)

    quantity: { type: String, required: true }, // e.g., "10 lbs"
    balance: { type: String }, // Can be numeric or string, depending on your logic

    startDate: { type: Date, required: true }, // Added
    endDate: { type: Date, required: true },   // Added

    status: {
      type: String,
      enum: [
        "running",
        "completed",
        "cancelled",
        "closed",
        "paused",
      ],
      required: true,
    },

    aging: { type: String }, // Aging info from the table

    customerName: { type: String, required: true }, // Added for frontend display (can also be derived via `customerId` ref)
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    contractType: {
      type: String,
      required: true,
      enum: ["general", "block-booking"],
    },
    allocationNumber: {
      type: String,
      required: function () {
        return this.contractType === "block-booking";
      },
    },

    description: [      // this is mainly a reference to proposal 
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        validate: {
          validator: function (value) {
            if (this.contractType === "general") {
              return mongoose.model("GeneralProposal").exists({ _id: value });
            } else if (this.contractType === "block-booking") {
              return mongoose
                .model("BlockBookingProposal")
                .exists({ _id: value });
            }
            return false;
          },
          message: (props) =>
            `Invalid description reference for contractType "${props.instance.contractType}".`,
        },
        refPath: "contractTypeDescriptionRef",
      },
    ],

    contractTypeDescriptionRef: {
      type: String,
      required: true,
      enum: ["GeneralProposal", "BlockBookingProposal"],
      default: function () {
        return this.contractType === "general"
          ? "GeneralProposal"
          : "BlockBookingProposal";
      },
    },

    soDocument: {
      name: { type: String },
      path: { type: String },
    },

    monthlyPlans: [
      {
        date: { type: Date, required: true },
        quantity: { type: Number, required: true },
        status: {
          type: String,
          enum: ["pending", "agreed", "rejected", "replied", "revised"],
          default: "pending",
        },
        supplierTerms: {
          date: { type: Date },
          quantity: { type: Number },
          remarks: { type: String },
        },
        finalAgreement: {
          date: { type: Date },
          quantity: { type: Number },
        },
      },
    ],

	eSignatures: {
		supplier: {
			name: { type: String },
			signedAt: { type: Date },
			signatureUrl: { type: String }, // or base64 string
		},
		customer: {
			name: { type: String },
			signedAt: { type: Date },
			signatureUrl: { type: String }, // or base64 string
		},
	},
	
	reason: {
		type: String
	}
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contract", contractSchema);
