const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { REMOTE_CLIENT_URL, PORT } = require("./config/dotenv");

const app = express();

var corsOptions = {
	origin: REMOTE_CLIENT_URL || "http://localhost:3000",
	optionsSuccessStatus: 200,
	credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to the database
connectDB();

app.get("/", (_, res) => res.json({ message: "Welcome to Textilia backend." }));

// Routes
const routes = require("./routes");
app.use("/api/v1", routes);

// Use the port from environment variables or default to 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
