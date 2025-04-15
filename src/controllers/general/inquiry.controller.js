const GeneralInquiry = require("../../models/general/inquiry.model");
const GeneralProposal = require("../../models/general/proposal.model");
const User = require("../../models/user.model");

const sanitize = require("mongo-sanitize");

exports.createGeneralInquiries = async (req, res) => {
	try {
		const userId = req.user.id;
		const inquiriesData = req.body.inquiries;

		if (!inquiriesData || (Array.isArray(inquiriesData) && inquiriesData.length === 0)) {
			return res.status(400).json({ message: "Inquiries data is missing or empty" });
		}

		const inquiries = await Promise.all(
			inquiriesData.map(async (inquiryData) => {
				const {
					quantity,
					quantityType,
					rate,
					deliveryStartDate,
					deliveryEndDate,
					po,
					certification,
					paymentMode,
					paymentDays,
					shipmentTerms,
					businessCondition,
					nomination,
					specifications,
					conewt,
					status,
				} = inquiryData;

				if (!quantity || !quantityType || !rate || !deliveryStartDate || !deliveryEndDate) {
					throw new Error("Missing required fields in one or more inquiries");
				}

				const newInquiry = new GeneralInquiry({
					customerId: userId,
					quantity,
					quantityType,
					rate,
					deliveryStartDate,
					deliveryEndDate,
					po,
					certification,
					paymentTerms: { paymentMode, paymentDays, shipmentTerms, businessCondition },
					nomination,
					specifications,
					conewt,
					status,
				});

				return newInquiry.save();
			})
		);

		res.status(201).json({
			message: `${inquiries.length} General Inquiries created successfully`,
			inquiries,
		});
	} catch (error) {
		res.status(500).json({
			message: error.message || "Error creating General Inquiries",
		});
	}
};

exports.closeInquiry = async (req, res) => {
	try {
		const inquiryId = sanitize(req.params.inquiryId);
		const { message } = req.body;
		
		const updateData = { 
			status: "inquiry_closed"
		};
		
		if (message) {
			updateData.closeReason = message;
		}
		
		const updatedInquiry = await GeneralInquiry.findByIdAndUpdate(
			inquiryId,
			updateData,
			{ new: true }
		);

		if (!updatedInquiry) {
			return res.status(404).json({ message: "Inquiry not found" });
		}

		res.status(201).json({
			message: "Inquiry closed successfully",
			updatedInquiry,
		});
	} catch (error) {
		console.log(error.message);
		res.status(500).json({
			message: "Error updating inquiry status",
			error: error.message,
		});
	}
};

exports.getGeneralInquiryById = async (req, res) => {
	try {
		const inquiryId = sanitize(req.params.inquiryId);
		const userId = req.user.id;

		const inquiry = await GeneralInquiry.findById(inquiryId)
			.populate("customerId", "name");

		if (!inquiry) {
			return res.status(404).json({ message: "Inquiry not found" });
		}

		const response = {
			inquiryDetails: inquiry,
			customerName: inquiry.customerId ? inquiry.customerId.name : "N/A",
		};

		const user = await User.findById(userId);

		if (user.businessType === "customer" && inquiry.nomination) {
			await inquiry.populate("nomination", "name");
			response.suppliers = inquiry.nomination.map(supplier => supplier.name);
		}

		res.status(200).json(response);
	} catch (error) {
		res.status(500).json({
			message: error.message || "Error retrieving General Inquiry",
		});
	}
};

exports.test = async (req, res) => {
	res.status(200).json({ message: "Test route" });
}

exports.getInquiries = async (req, res) => {
	try {
	  const userId = req.user.id;
	  const { businessType } = req.user; 
  
	  let query = businessType === "customer" ? { customerId: userId } : { nomination: userId };
	  let selectFields = "po rate specifications quantity quantityType createdAt status";
	  let populateFields = businessType === "supplier" ? { path: "customerId", select: "name" } : "";
  
	  if (businessType === "supplier") {
		selectFields += " deliveryStartDate deliveryEndDate paymentTerms";
	  }
  
	  // Fetch the inquiries based on the query
	  const inquiries = await GeneralInquiry.find(query)
		.sort({ createdAt: -1 })
		.select(selectFields)
		.populate(populateFields);
  
	  // Modify the status for suppliers: if a supplier has not sent a proposal, the status should be "inquiry_sent"
	  if (businessType === "supplier") {
		for (let inquiry of inquiries) {
		  // Check if a proposal exists for the inquiry, if not set status as "inquiry_sent"
		  const proposal = await GeneralProposal.findOne({ inquiryId: inquiry._id, supplierId: userId });
		  if (!proposal) {
			inquiry.status = "inquiry_sent"; // Update the status for the supplier
		  }
		}
	  } else if (businessType === "customer") {
        // Add proposal count for customers
        const inquiriesWithProposalCount = await Promise.all(
          inquiries.map(async (inquiry) => {
            const proposalCount = await GeneralProposal.countDocuments({ inquiryId: inquiry._id });
            const inquiryObj = inquiry.toObject();
            inquiryObj.proposalsReceived = proposalCount;
            return inquiryObj;
          })
        );
        return res.status(200).json(inquiriesWithProposalCount);
      }
  
	  res.status(200).json(inquiries);
	} catch (error) {
	  res.status(500).json({
		message: error.message || "Error retrieving inquiries",
	  });
	}
  };
  
  

