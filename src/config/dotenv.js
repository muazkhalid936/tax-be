const dotenv = require("dotenv");

dotenv.config();

module.exports = {
	REMOTE_CLIENT_URL: process.env.REMOTE_CLIENT_URL,
	MONGO_URI: process.env.MONGO_URI,
	PORT: process.env.PORT || 5000,
	JWT_SECRET: process.env.JWT_SECRET,
};
