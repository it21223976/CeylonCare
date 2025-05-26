import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavBar from '../../BottomNavBar';
import foodRecommendationModel from '../../../models/foodRecommendationModel';

const FoodRecommendations = ({ navigation }) => {
  const [recommendedFoods, setRecommendedFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userHealthData, setUserHealthData] = useState(null);
  const [shownFoodIds, setShownFoodIds] = useState(new Set());
  const [attemptCount, setAttemptCount] = useState(0);
  
  useEffect(() => {
    loadUserHealthData();
  }, []);

  const loadUserHealthData = async () => {
    try {
      const saved = await AsyncStorage.getItem('userHealthData');
      const healthData = saved ? JSON.parse(saved) : {
        medicalConditions: ['High Blood Pressure'],
        age: '35', weight: '70', height: '170'
      };
      setUserHealthData(healthData);
      await generateRecommendations(healthData);
    } catch (error) {
      console.error('Error loading health data:', error);
      setLoading(false);
    }
  };

  const generateRecommendations = async (healthData) => {
    setLoading(true);
    try {
      // Get more foods than needed
      let allRecommendations = await foodRecommendationModel.recommend(healthData, 25, true);
      
      // Filter out already shown foods
      let newRecommendations = allRecommendations.filter(
        food => !shownFoodIds.has(food.id)
      );
      
      // If we've shown most foods, reset
      if (newRecommendations.length < 8) {
        setShownFoodIds(new Set());
        setAttemptCount(0);
        newRecommendations = allRecommendations;
      }
      
      // Take first 8 new foods
      const selectedFoods = newRecommendations.slice(0, 8);
      
      // Update shown foods set
      const newShownIds = new Set(shownFoodIds);
      selectedFoods.forEach(food => newShownIds.add(food.id));
      setShownFoodIds(newShownIds);
      
      // Increment attempt count for additional shuffling
      setAttemptCount(prev => prev + 1);
      
      // Add some randomization based on attempt count
      const shuffled = [...selectedFoods].sort(() => 
        Math.random() - 0.5 + (attemptCount * 0.1)
      );

      const recommendationsWithImages = shuffled.map(food => ({
        ...food,
        image: getImageForFood(food.name)
      }));
      
      setRecommendedFoods(recommendationsWithImages);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getImageForFood = (foodName) => {
    const availableImages = {
      'aguna_kola_mallum': require('../../../assets/images/srilankan_food/Aguna Kola Mallum.jpg'),
      'ambra_juice': require('../../../assets/images/srilankan_food/Ambra-Juice.jpg'),
      'ash_banana_atu_kesel_curry': require('../../../assets/images/srilankan_food/Ash Banana (Alu Kesel) Curry.jpg'),
      'belimal_tea': require('../../../assets/images/srilankan_food/Belimal Tea.jpg'),
      'boild_manioc': require('../../../assets/images/srilankan_food/Boild manioc.jpg'),
      'boiled_purple_yam': require('../../../assets/images/srilankan_food/Boiled Purple Yam.jpg'),
      'boiled_red_kawpi_cowpea': require('../../../assets/images/srilankan_food/Boiled Red Kawpi (Cowpea).jpeg'),
      'bovitiya_tea': require('../../../assets/images/srilankan_food/Bovitiya Tea.png'),
      'brown_rice': require('../../../assets/images/srilankan_food/Brown Rice.jpg'),
      'cabbage_curry': require('../../../assets/images/srilankan_food/Cabbage Curry.jpg'),
      'chick_peas': require('../../../assets/images/srilankan_food/Chick peas.jpg'),
      'curry_leaves_salad': require('../../../assets/images/srilankan_food/Curry Leaves Salad.jpg'),
      'del_breadfruit_curry': require('../../../assets/images/srilankan_food/Del (Breadfruit) Curry.jpg'),
      'eggplant_and_tomato_stir_fry': require('../../../assets/images/srilankan_food/Eggplant and Tomato Stir Fry.jpg'),
      'eggplant_curry': require('../../../assets/images/srilankan_food/Eggplant Curry.jpg'),
      'fenugreek_drink': require('../../../assets/images/srilankan_food/Fenugreek Drink.jpg'),
      'garlic_and_tomato_soup': require('../../../assets/images/srilankan_food/Garlic and Tomato Soup.jpg'),
      'gotu_kola_herbal_tea': require('../../../assets/images/srilankan_food/Gotu Kola Herbal Tea.jpg'),
      'gotu_kola_sambol': require('../../../assets/images/srilankan_food/Gotu Kola sambol.jpg'),
      'halmasso_fish_curry': require('../../../assets/images/srilankan_food/Halmasso Fish Curry )Sri Lankan Sprats Curry.jpeg'),
      'iramusu_tea': require('../../../assets/images/srilankan_food/Iramusu Tea.jpg'),
      'karapincha_soup': require('../../../assets/images/srilankan_food/Karapincha Soup.jpg'),
      'karawila_curry': require('../../../assets/images/srilankan_food/Karawila Curry.jpg'),
      'kathurumurunga_mallum': require('../../../assets/images/srilankan_food/Kathurumurunga Mallum (Sesbania Grandiflora Leaf Mallum).jpg'),
      'kesel_muwa_curry': require('../../../assets/images/srilankan_food/Kesel Muwa Curry (Banana Flower Curry).png'),
      'kohila': require('../../../assets/images/srilankan_food/Kohila.jpeg'),
      'kola_kanda': require('../../../assets/images/srilankan_food/Kola Kanda.jpg'),
      'kurakkan_bread': require('../../../assets/images/srilankan_food/Kurakkan Bread.jpg'),
      'kurakkan_kanda': require('../../../assets/images/srilankan_food/Kurakkan Kanda .jpg'),
      'kurakkan_pittu': require('../../../assets/images/srilankan_food/Kurakkan Pittu.webp'),
      'kurakkan_roti': require('../../../assets/images/srilankan_food/Kurakkan Roti.jpeg'),
      'lime_and_ginger_tea': require('../../../assets/images/srilankan_food/Lime & Ginger Tea.jpg'),
      'lunu_kanda': require('../../../assets/images/srilankan_food/Lunu Kanda.jpg'),
      'mugunuwanna_mallum': require('../../../assets/images/srilankan_food/Mugunuwanna Mallum.jpg'),
      'mung_bean_curry': require('../../../assets/images/srilankan_food/Mung Bean Curry.jpg'),
      'murunga_leaves_mallum': require('../../../assets/images/srilankan_food/Murunga Leaves Mallum (Drumstick Leaves Stir-Fry).jpg'),
      'nelli_juice': require('../../../assets/images/srilankan_food/Nilkatarolu Juice.jpg'),
      'papaya_and_lime_juice': require('../../../assets/images/srilankan_food/Papaya & Lime Juice Drink.jpg'),
      'papaya_curry': require('../../../assets/images/srilankan_food/Papaya Curry.jpg'),
      'polpala_tea': require('../../../assets/images/srilankan_food/polpala tea.jpg'),
      'pumpkin_curry': require('../../../assets/images/srilankan_food/Pumpkin Curry.jpg'),
      'ranawara_tea': require('../../../assets/images/srilankan_food/Ranawara Tea.jpg'),
      'roasted_chickpeas': require('../../../assets/images/srilankan_food/Roasted Chickpeas.jpg'),
      'squashed_eggplant_curry': require('../../../assets/images/srilankan_food/Squashed Eggplant Curry.jpg'),
      'starfruit_salad': require('../../../assets/images/srilankan_food/starfruit-salad.jpg'),
      'sweet_potato_and_lentil_stew': require('../../../assets/images/srilankan_food/Sweet Potato and Lentil Stew.jpg'),
      'thebu_kola_sambola': require('../../../assets/images/srilankan_food/Thebu-Kola-Sambol.jpg'),
      'tomato_curry': require('../../../assets/images/srilankan_food/Tomato Curry.jpg'),
      'turmeric_tea': require('../../../assets/images/srilankan_food/Turmeric Tea (Golden Milk).jpg'),
      'white_kawpi': require('../../../assets/images/srilankan_food/white_kawpi.jpeg'),
    };

    // normalize
    const key = foodName.toLowerCase().replace(/[^\w]/g, '_');
    return availableImages[key] || require('../../../assets/images/food-icon.png');
  };

  const renderFoodItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.foodCard}
      onPress={() => navigation.navigate('FoodDetails', { food: item })}
    >
      <Image source={item.image} style={styles.foodImage} />
      <View style={styles.foodInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.foodName}>{item.name}</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{item.score}/100</Text>
          </View>
        </View>
        <Text style={styles.foodBenefits}>{item.benefits}</Text>
        <View style={styles.conditionTags}>
          {item.healthConditions.map((condition, index) => (
            <LinearGradient
              key={index}
              colors={['#33E4DB', '#00BBD3']}
              style={styles.conditionTag}
            >
              <Text style={styles.conditionText}>{condition}</Text>
            </LinearGradient>
          ))}
        </View>
        <View style={styles.nutritionInfo}>
          <Text style={styles.nutritionText}>🕐 {item.cookingTime} min</Text>
          <Text style={styles.nutritionText}>🔥 {item.calories} cal</Text>
          <Text style={styles.nutritionText}>🍽️ {item.portion}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Food Recommendations</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BBD3" />
          <Text style={styles.loadingText}>Generating personalized recommendations...</Text>
        </View>
        <BottomNavBar navigation={navigation} />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food Recommendations</Text>
      </View>
      
      <View style={styles.introContainer}>
        <Text style={styles.introText}>
          Based on your health profile, here are Sri Lankan foods that would benefit your wellbeing:
        </Text>
        {userHealthData?.medicalConditions && (
          <View style={styles.conditionsContainer}>
            <Text style={styles.conditionsLabel}>Your conditions:</Text>
            <View style={styles.userConditionTags}>
              {userHealthData.medicalConditions.map((condition, i) => (
                <View key={i} style={styles.userConditionTag}>
                  <Text style={styles.userConditionText}>{condition}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
      
      <FlatList
        data={recommendedFoods}
        renderItem={renderFoodItem}
        keyExtractor={(item, i) => i.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={() => generateRecommendations(userHealthData)}
      >
        <LinearGradient
          colors={['#33E4DB', '#00BBD3']}
          style={styles.refreshGradient}
        >
          <Text style={styles.refreshButtonText}>🔄 Generate New Recommendations</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <BottomNavBar navigation={navigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    backgroundColor: '#00BBD3',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '700', color: 'white', marginRight: 30 },
  backButton: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 30, color: 'white', fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#555555' },
  introContainer: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  introText: { fontSize: 16, color: '#555555', lineHeight: 22, marginBottom: 12 },
  conditionsContainer: { marginTop: 8 },
  conditionsLabel: { fontSize: 14, fontWeight: 'bold', color: '#333333', marginBottom: 8 },
  userConditionTags: { flexDirection: 'row', flexWrap: 'wrap' },
  userConditionTag: { backgroundColor: '#E8FFF6', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8, marginRight: 6, marginBottom: 6 },
  userConditionText: { fontSize: 12, color: '#00BBD3', fontWeight: '600' },
  listContainer: { padding: 16, paddingBottom: 120 },
  foodCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  foodImage: { width: '100%', height: 180, resizeMode: 'cover' },
  foodInfo: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  foodName: { fontSize: 18, fontWeight: 'bold', color: '#333333', flex: 1, marginRight: 10 },
  scoreContainer: { backgroundColor: '#E8FFF6', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8 },
  scoreText: { fontSize: 12, color: '#00BBD3', fontWeight: 'bold' },
  foodBenefits: { fontSize: 14, color: '#555555', marginBottom: 12, lineHeight: 20 },
  conditionTags: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  conditionTag: { borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
  conditionText: { fontSize: 12, color: 'white', fontWeight: '600' },
  nutritionInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  nutritionText: { fontSize: 12, color: '#888888' },
  refreshButton: { position: 'absolute', bottom: 90, left: 20, right: 20 },
  refreshGradient: { borderRadius: 12, padding: 16, alignItems: 'center' },
  refreshButtonText: { fontSize: 16, fontWeight: 'bold', color: 'white' },
});

export default FoodRecommendations;
