const GeneralProposal = require("../../models/general/proposal.model");
const GeneralInquiry = require("../../models/general/inquiry.model");

const mongoose = require("mongoose");

exports.createGeneralProposals = async (req, res) => {
  const proposalsData = req.body.proposals;

  if (!Array.isArray(proposalsData) || proposalsData.length === 0) {
    return res.status(400).json({ message: "No proposals provided" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const createdProposals = [];
    const invalidProposals = [];

    const createProposalPromises = proposalsData.map(async (proposalData) => {
      const {
        inquiryId,
        rate,
        quantity,
        quantityType,
        deliveryStartDate,
        deliveryEndDate,
        paymentMode,
        paymentDays,
        shipmentTerms,
        businessCondition,
      } = proposalData;

      const inquiry = await GeneralInquiry.findById(inquiryId).session(session);
      if (!inquiry) {
        throw new Error(`Inquiry not found for ID ${inquiryId}`);
      }

      const proposal = new GeneralProposal({
        inquiryId,
        supplierId: req.user.id,
        rate,
        quantity,
        quantityType,
        deliveryStartDate,
        deliveryEndDate,
        paymentMode,
        paymentDays,
        shipmentTerms,
        businessCondition,
        status: "proposal_sent",
      });

      await proposal.save({ session });
      createdProposals.push(proposal);

      if (inquiry.status !== "proposal_sent") {
        inquiry.status = "proposal_sent";
        await inquiry.save({ session });
      }
    });

    await Promise.all(createProposalPromises);

    if (invalidProposals.length > 0) {
      throw new Error("Some proposals were invalid. None of the proposals were saved.");
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Proposals created successfully",
      proposals: createdProposals,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession(); 
    res.status(500).json({
      message: error.message || "Error creating proposals",
    });
  }
};

exports.getProposals = async (req, res) => {
  try {
    const userId = req.user.id;  
    const { businessType } = req.user;
    let proposals = [];

    if (businessType === "customer") {
      proposals = await GeneralProposal.find()
        .populate({
          path: "inquiryId",
          select: "po specifications quantity quantityType status customerId",
          match: { customerId: userId }
        });

      const proposalCountByInquiry = proposals.reduce((acc, proposal) => {
        const inquiryId = proposal.inquiryId._id.toString();
        if (!acc[inquiryId]) {
          acc[inquiryId] = {
            inquiryDetails: proposal.inquiryId,
            proposalCount: 0
          };
        }
        acc[inquiryId].proposalCount += 1;
        return acc;
      }, {});

      proposals = Object.values(proposalCountByInquiry);
    } else if (businessType === "supplier") {
      proposals = await GeneralProposal.find({ supplierId: userId })
        .populate({
          path: "inquiryId",
          select: "details customerId",
          populate: { path: "customerId", select: "name" }
        })
        .sort({ createdAt: -1 });

      proposals = proposals.map(proposal => ({
        ...proposal.toObject(),
        customerName: proposal.inquiryId?.customerId?.name || "Unknown"
      }));
    }

    res.status(200).json({ proposals });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error retrieving proposals",
    });
  }
};


exports.acceptGeneralProposal = async (req, res) => {
  const { proposalId } = req.params;
  const { po } = req.body;  

  try {
    const proposal = await GeneralProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    const inquiry = await GeneralInquiry.findOne({
      _id: proposal.inquiryId,
      status: { $ne: "inquiry_closed" }
    });

    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    if (po) {
      inquiry.po = po;
    }
    else {
      return res.status(400).json({ message: "PO number is required" });
    }

    inquiry.status = "proposal_accepted";
    await inquiry.save();

    proposal.status = "proposal_accepted";
    if (!proposal.po && inquiry.po) {
      proposal.po = inquiry.po; 
    }
    await proposal.save();

    res.status(201).json({ message: "Proposal accepted successfully", proposal });
  } catch (error) {
    console.error("Error accepting proposal:", error.message);
    res.status(500).json({ message: "Error accepting proposal", error: error.message });
  }
};


exports.getInquiryProposals = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const userId = req.user.id;

    const inquiry = await GeneralInquiry.findById(inquiryId)
      .select("-customerId -__v")
      .lean();

    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found." });
    }

    const user = await mongoose.model("User")
      .findById(userId)
      .select("businessType")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let proposals;
    if (user.businessType === "supplier") {
      // First check if supplier has any proposals for this inquiry
      const supplierProposalCount = await GeneralProposal.countDocuments({
        inquiryId,
        supplierId: userId
      });

      if (supplierProposalCount === 0) {
        return res.status(404).json({ message: "No proposals found for your inquiry." });
      }

      // Check for other suppliers' proposals
      const otherSuppliersProposals = await GeneralProposal.countDocuments({
        inquiryId,
        supplierId: { $ne: userId },
      });

      if (otherSuppliersProposals > 0) {
        return res.status(403).json({
          message: "There are proposals from other suppliers for this inquiry.",
        });
      }

      // Get supplier's proposals
      proposals = await GeneralProposal.find({ 
        inquiryId,
        supplierId: userId 
      })
      .populate("supplierId", "name email")
      .lean();

    } else {
      // For customers, get all proposals
      proposals = await GeneralProposal.find({ inquiryId })
        .populate("supplierId", "name email")
        .lean();
    }

    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ message: "No proposals found for this inquiry." });
    }

    const response = {
      inquiryDetails: inquiry,
      proposals: proposals,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching inquiry proposals:", error.message);
    res.status(500).json({ 
      message: "Error fetching inquiry proposals",
      error: error.message 
    });
  }
};

