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
const fileUpload = require("express-fileupload");
const upload = require("./middleware/uploadMiddleware");
const path = require("path");
const {
  getHealthData,
  updateHealthData,
  deleteHealthData,
  getHealthDataForRecommendations
} = require("./controllers/healthController");
const { getChatRecommendation } = require("./controllers/chatController");
const { getARRecommendations, getTherapyDetails, processFrame, getTherapyPoseLandmarks } = require("./controllers/arController");
const mlController = require('./controllers/mlController');

const app = express();

// Custom CORS configuration
app.use(cors({ origin: "*" }));

// Increase body size limit for all routes (or apply to specific routes)
app.use(express.json({ limit: "2mb" })); // Set to 2MB for all requests
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
//app.use(fileUpload());

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

// New route for ML recommendations
app.get('/:userId/recommendations', getHealthDataForRecommendations);
// ML Model Management
app.post('/setup', mlController.setupMLModels.bind(mlController));
app.get('/health', mlController.healthCheck.bind(mlController));
app.get('/model-info', mlController.getModelInfo.bind(mlController));

// ML Predictions
app.post('/recommendations', mlController.getFoodRecommendations.bind(mlController));
app.get('/similar-foods/:foodId', mlController.getSimilarFoods.bind(mlController));
app.post('/meal-plan', mlController.generateMealPlan.bind(mlController));
app.post('/analyze-image', mlController.analyzeFoodImage.bind(mlController));

// AR Therapy Routes
app.get("/ar_therapy/:userId", getARRecommendations);
app.get("/therapy_details/:therapyName", getTherapyDetails);
app.post("/process_frame", express.json({ limit: "2mb" }), processFrame);
app.get("/therapy_landmarks/:therapyName", getTherapyPoseLandmarks);

// Chatbot Routes
app.post('/healthChat/:userId', getChatRecommendation);

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
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: "Payload too large", message: "Request body exceeds the allowed limit (2MB)" });
  } else {
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
});