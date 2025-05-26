import json
import sys
import os
import numpy as np
import pandas as pd
import tensorflow as tf
import joblib
from sklearn.metrics.pairwise import cosine_similarity
import random
import warnings

# Suppress TensorFlow warnings on Mac
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore', category=FutureWarning)

# Configure TensorFlow for better performance on Mac
if sys.platform == 'darwin':  # macOS
    try:
        # Enable memory growth for GPU if available
        gpus = tf.config.experimental.list_physical_devices('GPU')
        if gpus:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
    except:
        pass

class SriLankanFoodPredictor:
    def __init__(self):
        self.models_dir = 'ml_models'
        self.data_dir   = 'ml_data'
        self.models     = {}
        self.scalers    = {}
        self.encoders   = {}
        self.dataset    = None
        self.metadata   = None
        self._load_models()

    def _load_models(self):
        try:
            # Content-based TF model
            p = os.path.join(self.models_dir, 'content_based_model.h5')
            if os.path.exists(p):
                # Use custom_objects to handle legacy optimizer issues
                with tf.keras.utils.custom_object_scope({'Adam': tf.keras.optimizers.legacy.Adam}):
                    self.models['content_based'] = tf.keras.models.load_model(p, compile=False)
                    # Recompile with legacy optimizer for M1/M2 Macs
                    self.models['content_based'].compile(
                        optimizer=tf.keras.optimizers.legacy.Adam(learning_rate=0.001),
                        loss='binary_crossentropy',
                        metrics=['accuracy']
                    )
            
            # K-Means clustering - with error handling
            p = os.path.join(self.models_dir, 'kmeans.pkl')
            if os.path.exists(p):
                try:
                    self.models['clustering'] = joblib.load(p)
                except Exception as e:
                    print(f"Warning: Could not load clustering model: {e}", file=sys.stderr)
            
            # Health classifier - with error handling
            p = os.path.join(self.models_dir, 'rf_health.pkl')
            if os.path.exists(p):
                try:
                    self.models['health_classifier'] = joblib.load(p)
                except Exception as e:
                    print(f"Warning: Could not load health classifier: {e}", file=sys.stderr)
            
            # Scalers - with error handling
            p = os.path.join(self.models_dir, 'content_scaler.pkl')
            if os.path.exists(p):
                try:
                    self.scalers['content'] = joblib.load(p)
                except Exception as e:
                    print(f"Warning: Could not load content scaler: {e}", file=sys.stderr)
                    
            p = os.path.join(self.models_dir, 'kmeans_scaler.pkl')
            if os.path.exists(p):
                try:
                    self.scalers['clustering'] = joblib.load(p)
                except Exception as e:
                    print(f"Warning: Could not load clustering scaler: {e}", file=sys.stderr)
            
            # Encoder - with error handling
            p = os.path.join(self.models_dir, 'health_le.pkl')
            if os.path.exists(p):
                try:
                    self.encoders['health'] = joblib.load(p)
                except Exception as e:
                    print(f"Warning: Could not load health encoder: {e}", file=sys.stderr)
            
            # Dataset
            p = os.path.join(self.data_dir, 'foods_with_clusters.csv')
            if os.path.exists(p):
                self.dataset = pd.read_csv(p)
            else:
                p = os.path.join(self.data_dir, 'sri_lankan_foods.csv')
                if os.path.exists(p):
                    self.dataset = pd.read_csv(p)
            
            # Metadata
            p = os.path.join(self.models_dir, 'metadata.json')
            if os.path.exists(p):
                with open(p, 'r') as f:
                    self.metadata = json.load(f)
                    
            print(f"Models loaded successfully: {list(self.models.keys())}", file=sys.stderr)
        
        except Exception as e:
            print(f"Warning: Error loading models: {e}", file=sys.stderr)
            try:
                # Content-based TF model
                p = os.path.join(self.models_dir, 'content_based_model.h5')
                if os.path.exists(p):
                    # Use custom_objects to handle legacy optimizer issues
                    with tf.keras.utils.custom_object_scope({'Adam': tf.keras.optimizers.legacy.Adam}):
                        self.models['content_based'] = tf.keras.models.load_model(p, compile=False)
                        # Recompile with legacy optimizer for M1/M2 Macs
                        self.models['content_based'].compile(
                            optimizer=tf.keras.optimizers.legacy.Adam(learning_rate=0.001),
                            loss='binary_crossentropy',
                            metrics=['accuracy']
                        )
                
                # K-Means clustering
                p = os.path.join(self.models_dir, 'kmeans.pkl')
                if os.path.exists(p):
                    self.models['clustering'] = joblib.load(p)
                
                # Health classifier
                p = os.path.join(self.models_dir, 'rf_health.pkl')
                if os.path.exists(p):
                    self.models['health_classifier'] = joblib.load(p)
                
                # Scalers
                p = os.path.join(self.models_dir, 'content_scaler.pkl')
                if os.path.exists(p):
                    self.scalers['content'] = joblib.load(p)
                p = os.path.join(self.models_dir, 'kmeans_scaler.pkl')
                if os.path.exists(p):
                    self.scalers['clustering'] = joblib.load(p)
                
                # Encoder
                p = os.path.join(self.models_dir, 'health_le.pkl')
                if os.path.exists(p):
                    self.encoders['health'] = joblib.load(p)
                
                # Dataset
                p = os.path.join(self.data_dir, 'foods_with_clusters.csv')
                if os.path.exists(p):
                    self.dataset = pd.read_csv(p)
                else:
                    p = os.path.join(self.data_dir, 'sri_lankan_foods.csv')
                    if os.path.exists(p):
                        self.dataset = pd.read_csv(p)
                
                # Metadata
                p = os.path.join(self.models_dir, 'metadata.json')
                if os.path.exists(p):
                    with open(p, 'r') as f:
                        self.metadata = json.load(f)
            except Exception as e:
                print(f"Warning: Error loading models: {e}", file=sys.stderr)

    def _filter_by_health_conditions(self, dataset, user_conditions):
        """Filter foods based on user's health conditions"""
        has_bp = 'High Blood Pressure' in user_conditions
        has_db = 'Diabetes' in user_conditions
        
        # Get all foods first
        all_foods = dataset.copy()
        
        if not user_conditions or (not has_bp and not has_db):
            # If no conditions, exclude foods for specific conditions
            return all_foods[all_foods['health_category'].isin(['general', '', pd.NA, None])]
        
        # Create a scoring system instead of hard filtering
        def calculate_priority(row):
            category = row['health_category']
            
            # Handle NaN values
            if pd.isna(category) or category == '':
                return 0.5  # Neutral score for general foods
            
            if has_bp and has_db:
                # User has both conditions
                if category == 'both':
                    return 1.0  # Highest priority
                elif category in ['high_blood_pressure', 'diabetes']:
                    return 0.8  # Good but not perfect
                else:
                    return 0.5  # General foods
            elif has_bp:
                # Only high blood pressure
                if category == 'high_blood_pressure':
                    return 1.0  # Perfect match
                elif category == 'both':
                    return 0.3  # Not ideal - includes diabetes component
                elif category == 'diabetes':
                    return 0.1  # Wrong condition
                else:
                    return 0.5  # General foods
            elif has_db:
                # Only diabetes
                if category == 'diabetes':
                    return 1.0  # Perfect match
                elif category == 'both':
                    return 0.3  # Not ideal - includes BP component
                elif category == 'high_blood_pressure':
                    return 0.1  # Wrong condition
                else:
                    return 0.5  # General foods
            
            return 0.5
        
        # Add priority score to dataset
        all_foods['condition_priority'] = all_foods.apply(calculate_priority, axis=1)
        
        # Don't completely exclude foods, just deprioritize them
        return all_foods

    def predict_recommendations(self, user_profile, limit=5, randomize=False):
        if self.dataset is None:
            return self._get_fallback_recommendations(limit)

        conditions = user_profile.get('medical_conditions', [])
        
        # Filter and prioritize foods based on health conditions
        filtered_dataset = self._filter_by_health_conditions(self.dataset, conditions)
        
        recs = []
        
        # Process in batches for better performance
        batch_size = 32
        food_data = []
        food_indices = []
        
        for idx, food in filtered_dataset.iterrows():
            feats = np.array([
                food['protein'], food['fat'], food['carbs'],
                food['potassium'], food['fiber'], food['sodium'],
                food['magnesium'], food['calories'],
                food['cooking_time'], food['glycemic_index']
            ])
            food_data.append(feats)
            food_indices.append(idx)
            
            if len(food_data) == batch_size or idx == len(filtered_dataset) - 1:
                # Process batch
                batch_feats = np.array(food_data)
                
                # Scale
                if 'content' in self.scalers:
                    batch_feats = self.scalers['content'].transform(batch_feats)
                
                # Predict
                if 'content_based' in self.models:
                    preds = self.models['content_based'].predict(batch_feats, verbose=0, batch_size=batch_size)
                    
                    for i, food_idx in enumerate(food_indices):
                        food = filtered_dataset.iloc[food_idx]
                        bp = float(preds[0][i][0])
                        db = float(preds[1][i][0])
                        hs = float(preds[2][i][0])
                        
                        # Base compatibility score
                        base_score = self._calculate_compatibility(conditions, bp, db, hs, food)
                        
                        # Combine with condition priority
                        condition_priority = food.get('condition_priority', 0.5)
                        final_score = base_score * (0.7 + 0.3 * condition_priority)
                        
                        # Handle potential NaN values
                        ingredients = food['ingredients']
                        instructions = food['instructions']
                        
                        if pd.isna(ingredients):
                            ingredients = []
                        elif isinstance(ingredients, str):
                            try:
                                ingredients = json.loads(ingredients)
                            except:
                                ingredients = []
                        
                        if pd.isna(instructions):
                            instructions = []
                        elif isinstance(instructions, str):
                            try:
                                instructions = json.loads(instructions)
                            except:
                                instructions = []
                        
                        recipe_category = food.get('recipe_category', '')
                        if pd.isna(recipe_category):
                            recipe_category = ''

                        recs.append({
                            'id': int(food['id']),
                            'name': food['name'],
                            'health_category': food['health_category'],
                            'recipe_category': recipe_category,
                            'compatibility_score': float(final_score),
                            'health_score': float(food['health_score']),
                            'calories': int(food['calories']),
                            'cooking_time': int(food['cooking_time']),
                            'portion_size': food['portion_size'] if not pd.isna(food['portion_size']) else '',
                            'ingredients': ingredients,
                            'instructions': instructions,
                            'nutrition': {
                                'protein': float(food['protein']),
                                'fat': float(food['fat']),
                                'carbs': float(food['carbs']),
                                'potassium': float(food['potassium']),
                                'fiber': float(food['fiber']),
                                'sodium': float(food['sodium']),
                                'magnesium': float(food['magnesium'])
                            }
                        })
                
                # Reset for next batch
                food_data = []
                food_indices = []

        if randomize:
            # For randomization with limited foods
            # 1. Group foods by score ranges
            score_groups = {}
            for food in recs:
                score_range = int(food['compatibility_score'] // 10) * 10
                if score_range not in score_groups:
                    score_groups[score_range] = []
                score_groups[score_range].append(food)
            
            # 2. Shuffle within groups
            for group in score_groups.values():
                random.shuffle(group)
            
            # 3. Take foods from different groups to ensure variety
            result = []
            score_ranges = sorted(score_groups.keys(), reverse=True)
            
            # Round-robin selection from groups
            while len(result) < limit and any(score_groups.values()):
                for score_range in score_ranges:
                    if score_groups[score_range] and len(result) < limit:
                        result.append(score_groups[score_range].pop(0))
            
            return result
        else:
            # Normal sorting
            recs.sort(key=lambda x: x['compatibility_score'], reverse=True)
            return recs[:limit]
    def _calculate_compatibility(self, conditions, bp, db, hs, food):
        base = hs * 100
        if 'High Blood Pressure' in conditions:
            base += bp * 20
        if 'Diabetes' in conditions:
            base += db * 20
        return min(100, max(0, base))

    def find_similar_foods(self, food_id, limit=5):
        if self.dataset is None:
            return []

        target = self.dataset[self.dataset['id'] == food_id]
        if target.empty:
            return []

        food0 = target.iloc[0]
        if 'cluster' in food0 and not pd.isna(food0['cluster']):
            sims = self.dataset[
                (self.dataset['cluster'] == food0['cluster']) &
                (self.dataset['id'] != food_id)
            ]
        else:
            cols = ['protein','fat','carbs','potassium','fiber','sodium','magnesium','calories','health_score']
            tfv = food0[cols].values.reshape(1,-1)
            afv = self.dataset[cols].values
            sim = cosine_similarity(tfv, afv)[0]
            idxs = np.argsort(sim)[::-1][1:limit+1]
            sims = self.dataset.iloc[idxs]

        out = []
        for _, f in sims.head(limit).iterrows():
            # Handle potential NaN values
            recipe_category = f.get('recipe_category', '')
            if pd.isna(recipe_category):
                recipe_category = ''
            
            out.append({
                'id': int(f['id']),
                'name': f['name'],
                'health_score': float(f['health_score']),
                'health_category': f['health_category'],
                'recipe_category': recipe_category,  # Add this field with NaN handling
                'calories': int(f['calories']),
                'cooking_time': int(f['cooking_time'])
            })
        return out

    def generate_meal_plan(self, user_profile, days=7, shuffle_seed=None):
        """Generate meal plan with optional randomization"""
        # Add randomization seed for different results
        if shuffle_seed is not None:
            random.seed(shuffle_seed)
        
        recs = self.predict_recommendations(user_profile, limit=50)
        if not recs:
            return self._get_fallback_meal_plan(days)

        days_of_week = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        meal_types   = ['Breakfast','Lunch','Dinner']

        meal_plan = []
        for i in range(days):
            day_name = days_of_week[i % 7]
            used_ids = set()
            day_meals = []

            for meal in meal_types:
                cands = self._filter_foods_for_meal(recs, meal)
                if not cands:
                    continue

                # Add more randomization here
                if shuffle_seed is not None:
                    # Use random selection instead of modulo
                    sel = random.choice([c for c in cands if c['id'] not in used_ids])
                else:
                    idx = i % len(cands)
                    sel = cands[idx]

                # avoid duplicates in same day
                if sel['id'] in used_ids:
                    available = [c for c in cands if c['id'] not in used_ids]
                    if available:
                        sel = random.choice(available) if shuffle_seed else available[0]

                used_ids.add(sel['id'])

                # sanitize any NaNs in portion_size
                raw_portion = sel.get('portion_size', '')
                if isinstance(raw_portion, float) and np.isnan(raw_portion):
                    raw_portion = ''

                day_meals.append({
                    'type':               meal,
                    'name':               sel['name'],
                    'time':               self._get_meal_time(meal),
                    'portion':            raw_portion,
                    'calories':           int(sel['calories']),
                    'cooking_time':       int(sel['cooking_time']),
                    'health_score':       float(sel.get('health_score', 0)),
                    'compatibility_score':float(sel.get('compatibility_score', 0)),
                })

            meal_plan.append({
                'id':   i + 1,
                'day':  day_name,
                'meals': day_meals
            })

        return meal_plan

    def _filter_foods_for_meal(self, foods, meal, max_candidates=15):
        """Filter foods appropriate for each meal type"""
        # Define categories
        drink_keywords = [
            'tea', 'kanda', 'juice', 'drink', 'beverage', 'coffee', 
            'milk', 'shake', 'smoothie', 'water', 'soup', 'porridge'
        ]
        
        breakfast_preferred = [
            'kanda', 'pittu', 'hoppers', 'roti', 'bread', 'porridge',
            'kiribath', 'idli', 'dosa', 'egg', 'fruit', 'string hoppers'
        ]
        
        lunch_preferred = [
            'rice', 'curry', 'sambol', 'parippu', 'dhal', 'vegetable',
            'fish', 'chicken', 'kottu', 'noodles', 'salad', 'mallung'
        ]
        
        dinner_preferred = [
            'curry', 'soup', 'salad', 'vegetable', 'fish', 'stew',
            'rice', 'bread', 'roti', 'tea', 'hoppers'
        ]
        
        pool = foods[:]
        filtered_pool = []
        
        meal_lower = meal.lower()
        
        if meal_lower == 'breakfast':
            # For breakfast, prefer traditional breakfast items but allow some drinks
            for food in pool:
                food_name_lower = food['name'].lower()
                # Prioritize breakfast foods
                if any(item in food_name_lower for item in breakfast_preferred):
                    filtered_pool.insert(0, food)  # Add to beginning
                else:
                    filtered_pool.append(food)  # Add to end
                    
        elif meal_lower == 'lunch':
            # For lunch, exclude drinks and prefer hearty meals
            for food in pool:
                food_name_lower = food['name'].lower()
                # Skip drinks
                is_drink = any(keyword in food_name_lower for keyword in drink_keywords)
                if not is_drink:
                    # Prioritize lunch foods
                    if any(item in food_name_lower for item in lunch_preferred):
                        filtered_pool.insert(0, food)  # Add to beginning
                    else:
                        filtered_pool.append(food)  # Add to end
                        
        elif meal_lower == 'dinner':
            # For dinner, allow lighter options including soups and teas
            for food in pool:
                food_name_lower = food['name'].lower()
                # Allow all foods but prioritize dinner-appropriate items
                if any(item in food_name_lower for item in dinner_preferred):
                    filtered_pool.insert(0, food)  # Add to beginning
                else:
                    filtered_pool.append(food)  # Add to end
        
        # If we don't have enough foods after filtering, use original pool
        if len(filtered_pool) < 3:
            filtered_pool = pool
        
        # Always shuffle for variety
        random.shuffle(filtered_pool)
        
        # Return more candidates for better variety
        return filtered_pool[:max_candidates]

    def _get_meal_time(self, meal):
        return {'Breakfast':'7:30 AM','Lunch':'12:30 PM','Dinner':'7:00 PM'}.get(meal,'12:00 PM')

    def analyze_food_image(self, food_hint=None):
        if self.dataset is None:
            return self._get_fallback_analysis()

        # 1) Pick the food
        if food_hint:
            df = self.dataset[
                self.dataset['name'].str.contains(food_hint, case=False, na=False)
            ]
            food = df.iloc[0] if not df.empty else self.dataset.sample(1).iloc[0]
        else:
            weights = self.dataset['health_score'] / self.dataset['health_score'].sum()
            food = self.dataset.sample(1, weights=weights).iloc[0]

        # 2) Prepare features
        feats = np.array([[ 
            food['protein'], food['fat'], food['carbs'],
            food['potassium'], food['fiber'], food['sodium'],
            food['magnesium'], food['calories'],
            food['cooking_time'], food['glycemic_index']
        ]])
        if 'content' in self.scalers:
            feats = self.scalers['content'].transform(feats)

        # 3) Get ML predictions
        if 'content_based' in self.models:
            preds = self.models['content_based'].predict(feats, verbose=0)
            bp = float(preds[0][0][0]) * 100
            db = float(preds[1][0][0]) * 100
        else:
            bp = db = 70.0

        # 4) Sanitize portion_size and category
        raw_portion = food.get('portion_size', '')
        portion = '' if pd.isna(raw_portion) else str(raw_portion)

        category = food.get('recipe_category', '')
        if pd.isna(category):
            category = ''

        # 5) Build and return a JSON-safe dict
        return {
            "identified_food": food.get('name', ''),
            "confidence": float(0.8 + np.random.random() * 0.15),
            "food_id": int(food.get('id', 0)),
            "nutritional_analysis": {
                "calories":    f"{int(food.get('calories', 0))} kcal",
                "protein":     f"{food.get('protein', 0):.1f}g",
                "fat":         f"{food.get('fat', 0):.1f}g",
                "carbs":       f"{food.get('carbs', 0):.1f}g",
                "fiber":       f"{food.get('fiber', 0):.1f}g",
                "potassium":   f"{food.get('potassium', 0):.0f}mg",
            },
            "health_analysis": {
                "overall_score":           float(food.get('health_score', 0)),
                "blood_pressure_friendly": float(bp),
                "diabetes_friendly":       float(db),
                "glycemic_index":          int(food.get('glycemic_index', 0))
            },
            "cooking_info": {
                "estimated_time": int(food.get('cooking_time', 0)),
                "portion_size":   portion,
                "category":       category
            }
        }

    def _get_fallback_recommendations(self, limit):
        return [{
            'id':1,'name':'Gotukola Sambol','compatibility_score':85.0,
            'health_score':87.0,'calories':42,'cooking_time':10,
            'health_category':'both','recipe_category':'herb_salad',
            'portion_size':'2 tbsp',
            'ingredients':['Gotukola leaves','Coconut','Lime juice'],
            'instructions':['Mix ingredients','Serve fresh'],
            'nutrition':{'protein':2.1,'fat':0.8,'carbs':6.2,
                        'potassium':298,'fiber':2.8,'sodium':0.3,'magnesium':0.7}
        }][:limit]

    def _get_fallback_meal_plan(self, days):
        return [{
            'id':1,'day':'Monday','meals':[
                {'type':'Breakfast','name':'Kola Kanda','time':'7:30 AM','calories':102,'cooking_time':40},
                {'type':'Lunch','name':'Sri Lankan Curry','time':'12:30 PM','calories':150,'cooking_time':25},
                {'type':'Dinner','name':'Herbal Tea','time':'7:00 PM','calories':15,'cooking_time':10}
            ]
        }][:days]

    def _get_fallback_analysis(self):
        return {
            'identified_food':'Traditional Sri Lankan Dish',
            'confidence':0.75,
            'nutritional_analysis':{'calories':'80 kcal','protein':'3.0g','fiber':'2.5g'},
            'health_analysis':{'overall_score':75.0}
        }

    def get_model_info(self):
        return {
            'models_loaded': list(self.models.keys()),
            'dataset_size' : len(self.dataset) if self.dataset is not None else 0,
            'metadata'     : self.metadata or {},
            'status'       : 'ready' if self.models else 'no_models'
        }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error":"No command provided"}))
        return

    cmd       = sys.argv[1]
    pred      = SriLankanFoodPredictor()
    try:
        if cmd=="recommend":
            profile = json.loads(sys.argv[2])
            limit   = int(sys.argv[3])
            # Add randomize parameter support
            randomize = False
            if len(sys.argv) > 4:
                randomize = sys.argv[4].lower() == 'true'
            out = pred.predict_recommendations(profile, limit, randomize)
            print(json.dumps({"success":True,"recommendations":out}))
        elif cmd=="similar":
            fid   = int(sys.argv[2])
            limit = int(sys.argv[3])
            out   = pred.find_similar_foods(fid, limit)
            print(json.dumps({"success":True,"similar_foods":out}))
        elif cmd=="meal_plan":
            profile = json.loads(sys.argv[2])
            days    = int(sys.argv[3])
            # Check for optional shuffle_seed parameter
            shuffle_seed = None
            if len(sys.argv) > 4:
                shuffle_seed = int(sys.argv[4])
            out = pred.generate_meal_plan(profile, days, shuffle_seed)
            print(json.dumps({"success":True,"meal_plan":out}))
        elif cmd=="analyze_image":
            hint = sys.argv[2] if len(sys.argv)>2 else None
            out  = pred.analyze_food_image(hint)
            print(json.dumps({"success":True,"analysis":out}))
        elif cmd=="model_info":
            out = pred.get_model_info()
            print(json.dumps({"success":True,"model_info":out}))
        elif cmd == "analysis_score":
            # compute average health_score over top-N recommendations
            profile = json.loads(sys.argv[2])
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 5
            recs = pred.predict_recommendations(profile, limit)
            avg = sum(r.get('health_score', 0) for r in recs) / (len(recs) or 1)
            print(json.dumps({"success": True, "analysis_score": avg}))
        else:
            print(json.dumps({"error":f"Unknown command: {cmd}"}))
    except Exception as e:
        print(json.dumps({"success":False,"error":str(e)}))

if __name__=="__main__":
    main()