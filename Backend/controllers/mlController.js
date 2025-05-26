const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

class MLController {
  constructor() {
    // Auto-detect Python command for Mac
    this.pythonPath = this.detectPythonPath();
    this.mlScriptPath = path.join(__dirname, '../ml_python');
    this.setupScript = path.join(this.mlScriptPath, 'train_ml.py');
    this.predictScript = path.join(this.mlScriptPath, 'predict.py');
    this.foodImageScript = path.join(this.mlScriptPath, 'predict_food_image.py');
    
    // Mac-specific environment variables
    this.pythonEnv = {
      ...process.env,
      PYTHONUNBUFFERED: '1',  // Disable Python output buffering
      TF_CPP_MIN_LOG_LEVEL: '2',  // Suppress TensorFlow warnings
      OMP_NUM_THREADS: '4',  // Optimize for Mac processors
    };
    
    console.log(`[INFO] Python path detected: ${this.pythonPath}`);
  }

  // Auto-detect Python path on Mac
  detectPythonPath() {
    const possiblePaths = [
      'python3',
      'python',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      '/opt/homebrew/bin/python3',  // M1/M2 Macs with Homebrew
      '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3',  // Your specific path
    ];

    for (const pythonPath of possiblePaths) {
      try {
        const result = require('child_process').execSync(`${pythonPath} --version`, { 
          stdio: 'pipe',
          encoding: 'utf-8'
        });
        if (result.includes('Python')) {
          return pythonPath;
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    console.warn('[WARNING] Could not auto-detect Python path, using "python3"');
    return 'python3';
  }

  // Initialize and train ML models
  async setupMLModels(req, res) {
    try {
      console.log('[DEBUG] Starting ML model setup...');
      
      const { categorizationFile, recipesFile } = req.body;
      
      if (!categorizationFile || !recipesFile) {
        return res.status(400).json({
          error: 'Both categorization and recipes files are required'
        });
      }

      // Check if files exist
      const categorizationPath = path.join(this.mlScriptPath, 'documents', categorizationFile);
      const recipesPath = path.join(this.mlScriptPath, 'documents', recipesFile);

      if (!fsSync.existsSync(categorizationPath) || !fsSync.existsSync(recipesPath)) {
        return res.status(400).json({
          error: 'Required DOCX files not found in ml_python/documents/ folder'
        });
      }

      // Run Python ML setup script
      const result = await this.runPythonScript(this.setupScript, [
        categorizationPath,
        recipesPath
      ]);

      if (result.success) {
        console.log('[DEBUG] ML models trained successfully');
        res.status(200).json({
          success: true,
          message: 'ML models trained successfully',
          data: result.data
        });
      } else {
        console.error('[ERROR] ML training failed:', result.error);
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('[ERROR] ML setup error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to setup ML models'
      });
    }
  }

  // Get food recommendations
  async getFoodRecommendations(req, res) {
    try {
      console.log('[DEBUG] Getting ML food recommendations...');
      
      const { userProfile, limit = 5 } = req.body;
      
      if (!userProfile) {
        return res.status(400).json({
          error: 'User profile is required'
        });
      }

      // Run Python prediction script with timeout
      const result = await this.runPythonScript(this.predictScript, [
        'recommend',
        JSON.stringify(userProfile),
        limit.toString()
      ], 30000); // 30 second timeout

      if (result.success) {
        res.status(200).json({
          success: true,
          recommendations: result.data.recommendations,
          count: result.data.recommendations.length
        });
      } else {
        console.error('[ERROR] Recommendation failed:', result.error);
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('[ERROR] Recommendation error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations'
      });
    }
  }

  // Find similar foods
  async getSimilarFoods(req, res) {
    try {
      const { foodId } = req.params;
      const limit = parseInt(req.query.limit) || 5;

      console.log(`[DEBUG] Finding similar foods for food ID: ${foodId}`);

      const result = await this.runPythonScript(this.predictScript, [
        'similar',
        foodId,
        limit.toString()
      ]);

      if (result.success) {
        res.status(200).json({
          success: true,
          similar_foods: result.data.similar_foods,
          count: result.data.similar_foods.length
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('[ERROR] Similar foods error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to find similar foods'
      });
    }
  }

  // Generate meal plan
  async generateMealPlan(req, res) {
    try {
      console.log('[DEBUG] Generating ML meal plan...');
      
      const { userProfile, days = 7 } = req.body;

      if (!userProfile) {
        return res.status(400).json({
          error: 'User profile is required'
        });
      }

      const result = await this.runPythonScript(this.predictScript, [
        'meal_plan',
        JSON.stringify(userProfile),
        days.toString()
      ]);

      if (result.success) {
        res.status(200).json({
          success: true,
          meal_plan: result.data.meal_plan,
          days: result.data.meal_plan.length
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('[ERROR] Meal plan error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to generate meal plan'
      });
    }
  }

  // Analyze food image using the trained TensorFlow model
  async analyzeFoodImage(req, res) {
    let tempFilePath = null;
    
    try {
      console.log('[DEBUG] Analyzing food image with TensorFlow model...');
      
      const { imageData, foodHint = '' } = req.body;

      // Validate image data
      if (!imageData) {
        return res.status(400).json({
          success: false,
          error: 'Image data is required'
        });
      }

      // Check if image data is base64 encoded
      let base64Image = imageData;
      if (imageData.startsWith('data:image')) {
        // Extract base64 part from data URL
        base64Image = imageData.split(',')[1];
      }

      // Create a temporary file to store the base64 image data
      const tempDir = os.tmpdir();
      const tempFileName = `food_image_${uuidv4()}.txt`;
      tempFilePath = path.join(tempDir, tempFileName);
      
      // Write base64 data to temp file
      await fs.writeFile(tempFilePath, base64Image);
      console.log('[DEBUG] Wrote image data to temp file:', tempFilePath);

      // Run the food image prediction script with temp file path
      const result = await this.runPythonScript(this.foodImageScript, [
        tempFilePath,
        foodHint
      ], 30000); // 30 second timeout for image processing

      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
        console.log('[DEBUG] Cleaned up temp file');
      } catch (cleanupError) {
        console.error('[WARNING] Failed to clean up temp file:', cleanupError);
      }

      if (result.success) {
        console.log('[DEBUG] Food image analysis successful:', result.data.analysis.identifiedFood);
        res.status(200).json({
          success: true,
          analysis: result.data.analysis
        });
      } else {
        console.error('[ERROR] Food image analysis failed:', result.error);
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to analyze food image'
        });
      }
    } catch (error) {
      console.error('[ERROR] Food image analysis error:', error.message);
      
      // Clean up temp file in case of error
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          console.error('[WARNING] Failed to clean up temp file:', cleanupError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during image analysis'
      });
    }
  }

  // Get model information
  async getModelInfo(req, res) {
    try {
      console.log('[DEBUG] Getting ML model info...');

      // Check for food classification model
      const imageModelPath = path.join(__dirname, '../image_model/models/food_classifier_final.h5');
      const imageLabelsPath = path.join(__dirname, '../image_model/models/food_labels.json');
      const imageModelExists = fsSync.existsSync(imageModelPath);
      const imageLabelsExist = fsSync.existsSync(imageLabelsPath);

      // Get recommendation model info
      const result = await this.runPythonScript(this.predictScript, ['model_info']);

      const modelInfo = {
        recommendation_models: result.success ? result.data.model_info : { status: 'Not available' },
        food_classification_model: {
          status: imageModelExists ? 'Available' : 'Not trained',
          model_path: imageModelPath,
          labels_available: imageLabelsExist,
          model_type: 'TensorFlow/Keras - MobileNetV2 Transfer Learning'
        }
      };

      res.status(200).json({
        success: true,
        model_info: modelInfo
      });
    } catch (error) {
      console.error('[ERROR] Model info error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get model info'
      });
    }
  }

  // Helper method to run Python scripts with Mac optimizations
  runPythonScript(scriptPath, args = [], timeout = 60000) {
    return new Promise((resolve, reject) => {
      console.log(`[DEBUG] Running Python script: ${scriptPath}`);
      console.log(`[DEBUG] With args:`, args);
      console.log(`[DEBUG] Using Python path: ${this.pythonPath}`);
      
      // Spawn Python process with Mac-specific options
      const python = spawn(this.pythonPath, [scriptPath, ...args], {
        cwd: this.mlScriptPath,
        env: this.pythonEnv,
        stdio: ['pipe', 'pipe', 'pipe'],  // Explicit stdio configuration
        shell: false,  // Don't use shell on Mac
        detached: false
      });

      let stdout = '';
      let stderr = '';
      let timeoutId;
      let processKilled = false;

      // Set timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          processKilled = true;
          python.kill('SIGTERM');
          console.error(`[ERROR] Python script timed out after ${timeout}ms`);
          resolve({
            success: false,
            error: `Script execution timed out after ${timeout}ms`
          });
        }, timeout);
      }

      // Handle stdout with proper encoding
      python.stdout.setEncoding('utf8');
      python.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        
        // Log chunks for debugging
        if (chunk.trim()) {
          console.log('[DEBUG] Python output chunk:', chunk.substring(0, 100) + '...');
        }
      });

      // Handle stderr with proper encoding
      python.stderr.setEncoding('utf8');
      python.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        
        // Log non-warning stderr output
        if (chunk.trim() && !chunk.includes('WARNING')) {
          console.error('[DEBUG] Python stderr:', chunk);
        }
      });

      // Handle process close
      python.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId);
        
        if (processKilled) {
          return; // Already handled by timeout
        }

        console.log(`[DEBUG] Python process exited with code: ${code}`);
        
        if (code === 0) {
          try {
            // Clean up stdout
            const cleanStdout = stdout.trim();
            
            // Find JSON output (handle multiple JSON objects or extra output)
            let jsonMatch = cleanStdout.match(/\{[\s\S]*\}(?!.*\{)/);
            if (!jsonMatch) {
              throw new Error('No valid JSON found in output');
            }
            
            const jsonStr = jsonMatch[0];
            const result = JSON.parse(jsonStr);
            
            console.log('[DEBUG] Successfully parsed Python output');
            resolve({
              success: true,
              data: result
            });
          } catch (parseError) {
            console.error('[ERROR] Failed to parse Python output:', parseError.message);
            console.error('[ERROR] Raw stdout:', stdout);
            resolve({
              success: false,
              error: `Invalid response from ML script: ${parseError.message}`
            });
          }
        } else {
          console.error(`[ERROR] Python script failed with code: ${code}`);
          console.error('[ERROR] Stderr:', stderr);
          resolve({
            success: false,
            error: stderr || `Python script exited with code ${code}`
          });
        }
      });

      // Handle process error
      python.on('error', (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        
        console.error('[ERROR] Failed to start Python script:', error);
        
        if (error.code === 'ENOENT') {
          reject(new Error(`Python not found at ${this.pythonPath}. Please ensure Python is installed.`));
        } else {
          reject(error);
        }
      });
    });
  }

  // Health check for ML system
  async healthCheck(req, res) {
    try {
      const modelsDir = path.join(this.mlScriptPath, 'ml_models');
      const dataDir = path.join(this.mlScriptPath, 'ml_data');
      const imageModelDir = path.join(__dirname, '../image_model/models');

      // Check Python availability
      let pythonAvailable = false;
      let pythonVersion = 'Not detected';
      try {
        const result = require('child_process').execSync(`${this.pythonPath} --version`, {
          encoding: 'utf-8'
        });
        pythonAvailable = true;
        pythonVersion = result.trim();
      } catch (e) {
        console.error('[ERROR] Python check failed:', e.message);
      }

      // Check recommendation models
      const contentModelExists = fsSync.existsSync(path.join(modelsDir, 'content_based_model.h5'));
      const clusteringModelExists = fsSync.existsSync(path.join(modelsDir, 'kmeans.pkl'));
      const healthClfExists = fsSync.existsSync(path.join(modelsDir, 'rf_health.pkl'));

      // Check food classification model
      const foodModelExists = fsSync.existsSync(path.join(imageModelDir, 'food_classifier_final.h5'));
      const foodLabelsExist = fsSync.existsSync(path.join(imageModelDir, 'food_labels.json'));

      res.status(200).json({
        success: true,
        status: 'healthy',
        ml_system: {
          python_path: this.pythonPath,
          python_version: pythonVersion,
          python_available: pythonAvailable,
          directories_exist: fsSync.existsSync(modelsDir) && fsSync.existsSync(dataDir),
          recommendation_models_trained: contentModelExists && clusteringModelExists && healthClfExists,
          food_classification_model_trained: foodModelExists && foodLabelsExist,
          models: {
            content_based: contentModelExists,
            clustering: clusteringModelExists,
            health_classifier: healthClfExists,
            food_image_classifier: foodModelExists,
            food_labels: foodLabelsExist
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'ML health check failed'
      });
    }
  }

  // Compute average health-score for user profile
  async getAnalysisScore(req, res) {
    try {
      const { userProfile, limit = 5 } = req.body;
      if (!userProfile) {
        return res.status(400).json({ error: 'User profile is required' });
      }

      const result = await this.runPythonScript(this.predictScript, [
        'analysis_score',
        JSON.stringify(userProfile),
        limit.toString()
      ]);

      if (result.success) {
        return res.status(200).json({
          success: true,
          analysis_score: result.data.analysis_score
        });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('[ERROR] Analysis score error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analysis score' });
    }
  }

}



module.exports = new MLController();