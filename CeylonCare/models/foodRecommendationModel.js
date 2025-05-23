class MLFoodRecommendationModel {
    constructor() {
      this.apiBaseUrl = 'http://172.20.10.14:5000'; // Your Express server
      this.isConnected = false;
    }
  
    async initialize() {
      try {
        const response = await fetch(`${this.apiBaseUrl}/health`);
        const result = await response.json();
        
        if (result.success) {
          this.isConnected = true;
          console.log('✅ Connected to ML system');
          return true;
        }
      } catch (error) {
        console.error('❌ Failed to connect to ML system:', error);
        this.isConnected = false;
        return false;
      }
    }
  
    async recommend(userHealthData, limit = 5) {
      if (!this.isConnected) {
        await this.initialize();
      }
  
      try {
        const response = await fetch(`${this.apiBaseUrl}/recommendations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userProfile: {
              age: userHealthData.age,
              weight: userHealthData.weight,
              height: userHealthData.height,
              gender: userHealthData.gender,
              medical_conditions: userHealthData.medicalConditions || [],
              exercise_frequency: userHealthData.exerciseFrequency,
              allergies: userHealthData.allergies,
              dietary_preferences: userHealthData.dietaryPreferences
            },
            limit: limit
          })
        });
  
        const result = await response.json();
        
        if (result.success) {
          return result.recommendations.map(food => ({
            id: food.id,
            name: food.name,
            benefits: food.nutrition ? `Rich in ${Object.keys(food.nutrition).join(', ')}` : 'Healthy Sri Lankan food',
            healthConditions: this.mapCategoryToConditions(food.health_category),
            nutrition: food.nutrition,
            ingredients: food.ingredients,
            instructions: food.instructions,
            cookingTime: food.cooking_time,
            portion: food.portion_size,
            calories: food.calories,
            score: Math.round(food.compatibility_score),
            category: food.recipe_category
          }));
        } else {
          throw new Error(result.error || 'Failed to get recommendations');
        }
      } catch (error) {
        console.error('Error getting ML recommendations:', error);
        return this.getFallbackRecommendations(limit);
      }
    }
  
    async generateMealPlan(userHealthData, days = 7) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/meal-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userProfile: {
              age: userHealthData.age,
              weight: userHealthData.weight,
              height: userHealthData.height,
              gender: userHealthData.gender,
              medical_conditions: userHealthData.medicalConditions || [],
              exercise_frequency: userHealthData.exerciseFrequency
            },
            days: days
          })
        });
  
        const result = await response.json();
        
        if (result.success) {
          return result.meal_plan;
        } else {
          throw new Error(result.error || 'Failed to generate meal plan');
        }
      } catch (error) {
        console.error('Error generating meal plan:', error);
        return this.getFallbackMealPlan(days);
      }
    }
  
    async getSimilarFoods(foodId, limit = 5) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/similar-foods/${foodId}?limit=${limit}`);
        const result = await response.json();
        
        if (result.success) {
          return result.similar_foods;
        } else {
          throw new Error(result.error || 'Failed to find similar foods');
        }
      } catch (error) {
        console.error('Error finding similar foods:', error);
        return [];
      }
    }
  
    mapCategoryToConditions(category) {
      const mapping = {
        'high_blood_pressure': ['High Blood Pressure'],
        'diabetes': ['Diabetes'],
        'both': ['High Blood Pressure', 'Diabetes']
      };
      return mapping[category] || ['General Health'];
    }
  
    getFallbackRecommendations(limit) {
      return [
        {
          id: 1,
          name: 'Gotukola Sambol',
          benefits: 'Rich in antioxidants and minerals',
          healthConditions: ['General Health'],
          cookingTime: 10,
          calories: 42,
          score: 85
        }
      ].slice(0, limit);
    }
  
    getFallbackMealPlan(days) {
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      return Array.from({ length: days }, (_, i) => ({
        id: i + 1,
        day: daysOfWeek[i % 7],
        meals: [
          { type: 'Breakfast', name: 'Kola Kanda', time: '7:30 AM', calories: 102 },
          { type: 'Lunch', name: 'Traditional Curry', time: '12:30 PM', calories: 150 },
          { type: 'Dinner', name: 'Herbal Tea', time: '7:00 PM', calories: 80 }
        ]
      }));
    }
  
    async getModelInfo() {
      try {
        const response = await fetch(`${this.apiBaseUrl}/model-info`);
        const result = await response.json();
        
        if (result.success) {
          return {
            isTrained: true,
            ...result.model_info
          };
        }
      } catch (error) {
        console.error('Error getting model info:', error);
      }
      
      return { isTrained: false, error: 'Could not connect to ML server' };
    }
  }
  
  const mlFoodRecommendationModel = new MLFoodRecommendationModel();
  export default mlFoodRecommendationModel;