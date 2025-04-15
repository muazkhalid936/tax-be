const BlockBookingInquiry = require("../../models/blockBooking/inquiry.model");
const sanitize = require("mongo-sanitize"); 
const BlockBookingProposal = require("../../models/blockBooking/proposal.model");


exports.createInquiry = async (req, res) => {
  try {
    const inquiryData = req.body;

    if (!Array.isArray(inquiryData.countPrices)) {
      return res.status(400).json({ message: "`countPrices` must be an array." });
    }

    if (inquiryData.upperCount < inquiryData.lowerCount) {
      return res.status(400).json({ message: "Upper count cannot be less than lower count." });
    }

    const expectedCounts = [];
    for (let i = inquiryData.lowerCount; i <= inquiryData.upperCount; i++) {
      expectedCounts.push(i);
    }

    const providedCounts = inquiryData.countPrices.map(cp => cp.count);
    const missingCounts = expectedCounts.filter(c => !providedCounts.includes(c));
    if (missingCounts.length > 0) {
      return res.status(400).json({ message: `Missing prices for counts: ${missingCounts.join(", ")}` });
    }

    // Remove empty payment terms, this should be done in the frontend
    if (inquiryData.paymentTerms) {
      if (!inquiryData.paymentTerms.paymentMode || inquiryData.paymentTerms.paymentMode === '') {
        delete inquiryData.paymentTerms.paymentMode;
      }
      if (!inquiryData.paymentTerms.days || inquiryData.paymentTerms.days === '') {
        delete inquiryData.paymentTerms.days;
      }
      if (!inquiryData.paymentTerms.shipmentTerms || inquiryData.paymentTerms.shipmentTerms === '') {
        delete inquiryData.paymentTerms.shipmentTerms;
      }
      if (!inquiryData.paymentTerms.businessConditions || inquiryData.paymentTerms.businessConditions === '') {
        delete inquiryData.paymentTerms.businessConditions;
      }
      // If paymentTerms is now an empty object, remove it entirely
      if (Object.keys(inquiryData.paymentTerms).length === 0) {
        delete inquiryData.paymentTerms;
      }
    }
    inquiryData.customerId = req.user.id;

    const inquiry = new BlockBookingInquiry(inquiryData);
    const savedInquiry = await inquiry.save();
    res.status(201).json(savedInquiry);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getInquiries = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { businessType } = req.user;
    let inquiries = [];

    if (businessType === "customer") {
      // Get inquiries for customer with proposal counts
      inquiries = await BlockBookingInquiry.find({ customerId: userId })
        .select("baseCount quantity quantityType deliveryEndDate status aging")
        .lean()
        .sort({ createdAt: -1 });

      const inquiryIds = inquiries.map((inquiry) => inquiry._id);

      const proposalCounts = await BlockBookingProposal.aggregate([
        { $match: { inquiryId: { $in: inquiryIds } } },
        {
          $group: {
            _id: "$inquiryId",
            proposalsReceived: { $sum: 1 },
          },
        },
      ]);

      const proposalCountMap = proposalCounts.reduce((acc, cur) => {
        acc[cur._id.toString()] = cur.proposalsReceived;
        return acc;
      }, {});

      inquiries = inquiries.map((inquiry) => ({
        ...inquiry,
        proposalsReceived: proposalCountMap[inquiry._id.toString()] || 0,
      }));

    } else if (businessType === "supplier") {
      // Get inquiries for supplier
      inquiries = await BlockBookingInquiry.find()
        .select("aging baseCount quantity quantityType deliveryStartDate deliveryEndDate status customerId")
        .populate("customerId", "name email")
        .lean()
        .sort({ createdAt: -1 });
    }

    res.status(200).json(inquiries);
  } catch (error) {
    console.error("Error fetching inquiries:", error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getInquiry = async (req, res) => {
  try {
    const inquiryId = sanitize(req.params.inquiryId); 
    const inquiry = await BlockBookingInquiry.findById(inquiryId)
      .populate("customerId", "name email")
      .lean(); 

    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found." });
    }

    res.status(200).json(inquiry);
  } catch (error) {
    console.error("Error fetching inquiry:", error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.declineInquiry = async (req, res) => {
  try {
    const inquiryId = sanitize(req.params.inquiryId); 
    
    const inquiry = await BlockBookingInquiry.findByIdAndUpdate(
      inquiryId,
      { status: "inquiry_closed" },
      { new: true }
    ).lean();

    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found." });
    }

    // Update all proposals related to this inquiry
    await BlockBookingProposal.updateMany(
      { inquiryId: inquiryId },
      { status: "inquiry_closed" }
    );

    // Respond with the updated inquiry data
    res.status(201).json(inquiry);
  } catch (error) {
    console.error("Error declining inquiry:", error.message);
    res.status(500).json({ error: error.message });
  }
};