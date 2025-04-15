const jwt = require("jsonwebtoken");

const protect = (roles = []) => {
	return (req, res, next) => {
		const token = req.headers.authorization?.split(" ")[1];
		if (!token)
			return res
				.status(401)
				.json({ message: "No token, authorization denied" });

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			req.user = decoded;
			if (roles.length && !roles.includes(req.user.businessType)) {
				return res.status(403).json({ message: "Access denied" });
			}

			next();
		} catch (error) {
			res.status(401).json({ message: "Invalid token" });
		}
	};
};

module.exports = { protect };
