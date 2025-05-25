// src/models/foodImageAnalysisModel.js

class FoodImageAnalysisModel {
    constructor() {
      // point this at your Express server
      this.apiBaseUrl = 'http://172.20.10.14:5000';
    }
  
    /**
     * Analyze a food image.
     * @param {string} imageUri   The local URI or placeholder for the image.
     * @param {string} [foodHint] Optional hint text (e.g. filename, tags).
     * @returns {Promise<Object>} The `analysis` object from your backend.
     */
    async analyzeImage(imageUri, foodHint = '') {
      // you could extract a hint from the URI if you want,
      // but by default we'll just pass the provided hint string
      try {
        const response = await fetch(`${this.apiBaseUrl}/analyze-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ foodHint }),
        });
  
        const json = await response.json();
        if (!json.success) {
          throw new Error(json.error || 'Image analysis failed');
        }
  
        // your backend sends `{ success: true, analysis: { ... } }`
        return json.analysis;
      } catch (err) {
        console.error('‼️ FoodImageAnalysisModel.analyzeImage error:', err);
        // rethrow so callers can handle errors
        throw err;
      }
    }
  }
  
  const foodImageAnalysisModel = new FoodImageAnalysisModel();
  export default foodImageAnalysisModel;
  