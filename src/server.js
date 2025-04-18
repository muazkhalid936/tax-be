const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { PORT } = require("./config/dotenv");

const app = express();

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000", // Your local development
  "https://taxtilla.vercel.app" // Your production frontend
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions)); // Enable preflight for all routes

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to the database
connectDB();

// Routes
const routes = require("./routes");
app.use("/api/v1", routes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));