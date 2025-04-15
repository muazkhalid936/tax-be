const mongoose = require("mongoose");

const paymentTermsSchema = new mongoose.Schema(
  {
    paymentMode: {
      type: String,
      enum: ["advance", "credit", "pdc", "advance_pdc", "lc"],
    },
    paymentDays: { type: Number },
    shipmentTerms: { type: String },
    businessCondition: {
      type: String,
      enum: ["efs", "gst", "non_gst"],
    },
  },
  { _id: false }
);

const generalInquirySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      validate: {
        validator: async (value) => {
          const user = await mongoose.model("User").findById(value);
          return user && user.businessType === "customer";
        },
        message: (props) => `${props.value} is not a valid customer.`,
      },
    },
    po: { type: Number },
    quantity: { type: Number, required: true, min: 0.01 },
    quantityType: {
      type: String,
      enum: ["kg", "lbs", "bags"],
      required: true,
    },
    rate: {
      type: Number, required: true, min: 0.01
    },
    deliveryStartDate: { type: Date, required: true },
    deliveryEndDate: { type: Date, required: true },
    certification: {
      type: [String],
      enum: ["GOTS", "RWS", "Global Recycled Standard", "EU Ecolabel"],
    },
    paymentTerms: paymentTermsSchema,
    nomination: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    specifications: { type: String, required: true },
    conewt: { type: Number },
    status: {
      type: String,
      enum: [
        "inquiry_sent",
        "proposal_sent",
        "negotiation",
        "proposal_accepted",
        "contract_sent",
        "contract_accepted",
        "contract_running",
        "delivered",
        "inquiry_closed",
      ],
      default: "inquiry_sent",
    },
    closeReason: {
      type: String,
      trim: true
    },
  },
  { timestamps: true }
);

generalInquirySchema.index({ customerId: 1, status: 1 });

module.exports = mongoose.model("GeneralInquiry", generalInquirySchema);
