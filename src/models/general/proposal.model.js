const mongoose = require("mongoose");

const paymentTermsSchema = new mongoose.Schema({
    paymentMode: {
        type: String,
        enum: ["advance", "credit", "pdc", "advance_pdc", "lc"],
    },
    paymentDays: { 
        type: Number 
    },
    shipmentTerms: { 
        type: String 
    },
    businessCondition: {
        type: String,
        enum: ["efs", "gst", "non_gst"],
    },
}, { _id: false });

const generalProposalSchema = new mongoose.Schema({
    inquiryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GeneralInquiry",
        required: true
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    rate: { 
        type: Number, 
        required: true,
        min: 0.01
    },
    quantity: { 
        type: Number, 
        required: true,
        min: 0.01
    },
    quantityType: {
        type: String,
        enum: ["kg", "lbs", "bags"],
        required: true
    },
    deliveryStartDate: { 
        type: Date, 
        required: true 
    },
    deliveryEndDate: { 
        type: Date, 
        required: true 
    },
    paymentTerms: paymentTermsSchema,
    status: {
        type: String,
        enum: [
            "proposal_sent",    
            "negotiation",       
            "proposal_accepted", 
            "contract_sent",      
            "contract_accepted", 
            "contract_running",   
            "delivered",        
            "inquiry_closed"  
        ],
        default: "proposal_sent"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("GeneralProposal", generalProposalSchema);
