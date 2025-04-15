const jwt = require("jsonwebtoken");

const generateToken = (user) => {
	return jwt.sign(
		{ id: user._id, businessType: user.businessType },
		process.env.JWT_SECRET,
		{
			expiresIn: "30d",
		}
	);
};

module.exports = { generateToken };
