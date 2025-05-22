const express = require("express");
const cors = require("cors");
const {
  registerUser,
  loginUser,
  sendResetPasswordEmail,
  getUserProfile,
  updateUserProfile,
  logoutUser,
} = require("./controllers/userController");
const upload = require("./middleware/uploadMiddleware");
const path = require("path");
const {
  getHealthData,
  updateHealthData,
  deleteHealthData,
} = require("./controllers/healthController");
//const { getChatRecommendation } = require("./controllers/chatController");
const { getARRecommendations, getTherapyDetails } = require("./controllers/arController");
const fileUpload = require("express-fileupload");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(fileUpload());

// User Routes
app.post("/register", registerUser);
app.post("/login", loginUser);
app.post("/forgetPassword", sendResetPasswordEmail);
app.post("/logout", logoutUser);
app.get("/user/:userId", getUserProfile);
app.put("/user/:userId", upload.single("profilePhoto"), updateUserProfile);

// Health Data Routes
app.get("/healthData/:userId", getHealthData);
app.put("/healthData/:userId", updateHealthData);
app.delete("/healthData/:userId", deleteHealthData);

// AR Therapy Routes
app.get("/ar_therapy/:userId", getARRecommendations);
app.get("/therapy_details/:therapyName", getTherapyDetails);

// Chatbot Routes
//app.post('/healthChat/:userId', getChatRecommendation);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`[DEBUG] Backend server running at http://localhost:${PORT}`);
  console.log('[DEBUG] Registered routes:', app._router.stack
    .filter(r => r.route)
    .map(r => `${r.route.path} (${Object.keys(r.route.methods).join(', ')})`));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[ERROR] Server Error:", err.stack);
  res.status(500).json({ error: "Internal server error", message: err.message });
});