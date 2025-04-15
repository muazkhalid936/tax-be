const User = require("../models/user.model");

const getSuppliers = async (req, res) => {
	try {
		const suppliers = await User.find({ businessType: "supplier" }).select(
			"name _id email"
		);

		if (!suppliers || suppliers.length === 0) {
			return res.status(404).json({ message: "No suppliers found." });
		}

		res.json(suppliers);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error", error });
	}
};

// Update user profile and handle certificate uploads
const updateProfile = async (req, res) => {
	const {
		companyDetails,
		contactPersonInfo,
		certificateNames,
		specifications,
	} = req.body;

	console.log(req.body);

	try {
		const user = await User.findById(req.user.id);
		if (!user) return res.status(404).json({ message: "User not found" });

		// Update company details and contact person info
		if (companyDetails) {
			user.profile.companyDetails = {
				...user.profile.companyDetails,
				...JSON.parse(companyDetails), // Parse JSON data received in form
			};
		}

		if (contactPersonInfo) {
			const parsedContactPersonInfo = JSON.parse(contactPersonInfo);
			user.profile.contactPersonInfo = {
				...user.profile.contactPersonInfo,
				name: parsedContactPersonInfo.contactPersonName,
				email: parsedContactPersonInfo.contactPersonEmail,
				phoneNumber: parsedContactPersonInfo.contactPersonNumber,
				department: parsedContactPersonInfo.department,
				designation: parsedContactPersonInfo.designation,
			};
		}

		// Handle certificates upload (only for suppliers or agents)
		if (user.businessType === "supplier" || user.businessType === "agent") {
			// Handle certificate uploads
			if (certificateNames && req?.files?.length) {
				const parsedCertificateNames = JSON.parse(certificateNames); // Parse certificate names from JSON string
				const newCertificates = req.files.map((file, index) => ({
					name: parsedCertificateNames[index], // Match certificate name with the uploaded file
					filePath: file.path, // Store the file path
				}));

				console.log("newCertificates", newCertificates);
				console.log("user.certificates", user);

				// Update certificates
				user.profile.certificates = [
					...user.profile.certificates,
					...newCertificates,
				];
			}

			// Handle market specifications update
			if (specifications) {
				const updatedSpecifications = JSON.parse(specifications);

				// Iterate through each market and update the specifications
				for (const market of Object.keys(
					updatedSpecifications.marketSpecifications
				)) {
					if (user.profile.specifications.markets[market]) {
						user.profile.specifications.markets[market] = {
							...user.profile.specifications.markets[market],
							...updatedSpecifications.marketSpecifications[market],
						};
					} else {
						user.profile.specifications.markets[market] =
							updatedSpecifications[market];
					}
				}

				// Update the Material, Blend, and CountRange fields
				if (updatedSpecifications.material) {
					user.profile.specifications.material = updatedSpecifications.material;
				} else {
					return res.status(400).json({
						message: "Material field is required in specifications",
					});
				}
				if (updatedSpecifications.blend) {
					user.profile.specifications.blend = updatedSpecifications.blend;
				} else {
					return res.status(400).json({
						message: "Blend field is required in specifications",
					});
				}
				if (updatedSpecifications.countRange) {
					user.profile.specifications.countRange =
						updatedSpecifications.countRange;
				} else {
					return res.status(400).json({
						message: "CountRange field is required in specifications",
					});
				}
			}
		}

		await user.save();
		res.json({
			message: "Profile updated successfully",
			profile: user.profile,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error", error });
	}
};

module.exports = {
	getSuppliers,
	updateProfile,
};
