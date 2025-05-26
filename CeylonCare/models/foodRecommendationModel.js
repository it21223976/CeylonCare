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
  
    async recommend(userHealthData, limit = 5, randomize = false) {
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
            limit: limit,
            randomize: randomize  // Add this line
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
  
    async generateMealPlan(userHealthData, days = 7, randomSeed = null) {
      try {
        const requestBody = {
          userProfile: {
            age: userHealthData.age,
            weight: userHealthData.weight,
            height: userHealthData.height,
            gender: userHealthData.gender,
            medical_conditions: userHealthData.medicalConditions || [],
            exercise_frequency: userHealthData.exerciseFrequency
          },
          days: days
        };

        // Add random seed if provided
        if (randomSeed !== null) {
          requestBody.randomSeed = randomSeed;
        }

        const response = await fetch(`${this.apiBaseUrl}/meal-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
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
      
      const breakfastOptions = [
        { name: 'Kola Kanda', calories: 102 },
        { name: 'String Hoppers', calories: 180 },
        { name: 'Kiribath', calories: 220 },
        { name: 'Pittu', calories: 195 }
      ];
      
      const lunchOptions = [
        { name: 'Traditional Rice and Curry', calories: 450 },
        { name: 'Vegetable Kottu', calories: 380 },
        { name: 'Fish Curry with Rice', calories: 420 },
        { name: 'Dhal Curry with Roti', calories: 350 }
      ];
      
      const dinnerOptions = [
        { name: 'Hoppers with Curry', calories: 280 },
        { name: 'Vegetable Soup', calories: 120 },
        { name: 'Grilled Fish with Salad', calories: 250 },
        { name: 'Herbal Tea with Light Snack', calories: 80 }
      ];
      
      return Array.from({ length: days }, (_, i) => ({
        id: i + 1,
        day: daysOfWeek[i % 7],
        meals: [
          { 
            type: 'Breakfast', 
            name: breakfastOptions[i % breakfastOptions.length].name, 
            time: '7:30 AM', 
            calories: breakfastOptions[i % breakfastOptions.length].calories,
            portion: '1 serving'
          },
          { 
            type: 'Lunch', 
            name: lunchOptions[i % lunchOptions.length].name, 
            time: '12:30 PM', 
            calories: lunchOptions[i % lunchOptions.length].calories,
            portion: '1 serving'
          },
          { 
            type: 'Dinner', 
            name: dinnerOptions[i % dinnerOptions.length].name, 
            time: '7:00 PM', 
            calories: dinnerOptions[i % dinnerOptions.length].calories,
            portion: '1 serving'
          }
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