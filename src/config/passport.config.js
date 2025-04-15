const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user.model"); // Adjust path as necessary
const { generateToken } = require("../util/token");

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			// callbackURL: process.env.GOOGLE_CALLBACK_URL,
			callbackURL: "http://localhost:5000/api/auth/google/callback",
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				let user = await User.findOne({ email: profile.emails[0].value });

				// If user does not exist, create a new one
				if (!user) {
					user = await User.create({
						name: profile.displayName,
						email: profile.emails[0].value,
						googleId: profile.id,
						businessType: "customer", // Default type
					});
				}

				// Generate JWT token for the user
				const token = generateToken(user);
				done(null, { ...user.toObject(), token }); // Attach token to user object
			} catch (error) {
				done(error, null);
			}
		}
	)
);

// Serialize user for session management (if using sessions)
passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (error) {
		done(error, null);
	}
});
