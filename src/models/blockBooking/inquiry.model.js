const mongoose = require("mongoose");

const blockBookingInquirySchema = new mongoose.Schema({
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
  baseSpecs: {
    carded: { type: Boolean, default: false },
    combed: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
    plain: { type: Boolean, default: false },
    slub: { type: Boolean, default: false },
    lycra: { type: Boolean, default: false }
  },
  baseCount: { type: Number, min: 6, max: 120, required: true },
  slubUpcharge: { type: Number, required: true },
  targetBasePrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  quantityType: {
    type: String,
    enum: ["kg", "lbs", "bags"],
    required: true
  },
  deliveryStartDate: { type: Date, required: true },
  deliveryEndDate: { type: Date, required: true },
  upperCount: { type: Number, min: 6, max: 120, required: true },
  lowerCount: { type: Number, min: 6, max: 120, required: true },
  countPrices: [{
    count: { type: Number },
    price: { type: Number }
  }],

  paymentTerms: {
    paymentMode: { type: String, enum: ["advance", "credit", "pdc", "advance_pdc", "lc"] },
    days: { type: Number },
    shipmentTerms: { type: String },
    businessConditions: {
      type: String,
      enum: ["efs", "gst", "non_gst"]
    }
  },
  materialCharges: [{
    material: { type: String },
    upcharge: { type: Number}
  }],
  certificateUpcharges: [{
    certificate: { type: String},
    upcharge: { type: Number }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  aging: { type: Number, default: 0 },
  status: {
    type: String,
    enum: [
      "inquiry_sent",       // Inquiry has been sent by the customer.
      "proposal_sent",      // Supplier has responded with a proposal.
      "negotiation",        // Inquiry is under negotiation.
      "proposal_accepted",  // Customer has accepted the proposal.
      "contract_sent",      // Supplier has sent the contract.
      "contract_accepted",  // Contract has been accepted by the customer.
      "contract_running",   // Contract is currently in progress.
      "delivered",          // Items/services under the contract have been delivered.
      "inquiry_closed"      // Inquiry has been closed by either party.
    ],
    default: "inquiry_sent",
  }
});

blockBookingInquirySchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.updatedAt = new Date();
    if (this.status === "inquiry_replied") {
      const createdAt = this.createdAt || new Date();
      const updatedAt = this.updatedAt || new Date();
      const diffInTime = updatedAt.getTime() - createdAt.getTime();
      this.aging = Math.floor(diffInTime / (1000 * 60 * 60 * 24));
    }
  }
  next();
});

module.exports = mongoose.model("BlockBookingInquiry", blockBookingInquirySchema);
