import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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

const MealPlan = ({ navigation }) => {
  const [mealPlan, setMealPlan] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // fire-and-forget is ok, but it's async inside:
    generateMealPlan();
  }, []);

  const generateMealPlan = async () => {
    setLoading(true);
    try {
      // 1) load user health data
      const saved = await AsyncStorage.getItem('userHealthData');
      const healthData = saved
        ? JSON.parse(saved)
        : {
            medicalConditions: ['High Blood Pressure'],
            age: '35',
            weight: '70',
            height: '170'
          };

      // 2) Generate a random seed for variety
      const randomSeed = Math.floor(Math.random() * 10000);

      // 3) await the async model call with random seed
      const generatedPlan = await foodRecommendationModel.generateMealPlan(
        healthData, 
        7, 
        randomSeed
      );
      
      // 4) update state
      setMealPlan(generatedPlan);

      if (generatedPlan.length > 0) {
        setSelectedDay(generatedPlan[0].day);
      }
    } catch (error) {
      console.error('Error generating meal plan:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const renderDayTab = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.dayTab,
        selectedDay === item.day && styles.selectedDayTab
      ]}
      onPress={() => setSelectedDay(item.day)}
    >
      <LinearGradient
        colors={selectedDay === item.day ? ['#33E4DB', '#00BBD3'] : ['transparent','transparent']}
        style={styles.dayTabGradient}
      >
        <Text 
          style={[
            styles.dayTabText, 
            selectedDay === item.day && styles.selectedDayTabText
          ]}
        >
          {item.day.slice(0,3)}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
  
  const renderMeal = ({ item }) => (
    <View style={styles.mealCard}>
      <View style={styles.mealTypeContainer}>
        <LinearGradient
          colors={['#33E4DB', '#00BBD3']}
          style={styles.mealTypeGradient}
        >
          <Text style={styles.mealType}>{item.type}</Text>
        </LinearGradient>
        <Text style={styles.mealTime}>{item.time}</Text>
      </View>
      <Text style={styles.mealName}>{item.name}</Text>
      {item.benefits && <Text style={styles.mealBenefits}>{item.benefits}</Text>}
      <View style={styles.mealMeta}>
        <Text style={styles.mealPortion}>Portion: {item.portion}</Text>
        <Text style={styles.mealCalories}>{item.calories} cal</Text>
      </View>
    </View>
  );
  
  const selectedDayPlan = mealPlan.find(d => d.day === selectedDay);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meal Plan</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BBD3" />
          <Text style={styles.loadingText}>
            Generating your personalized meal plan...
          </Text>
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
        <Text style={styles.headerTitle}>Meal Plan</Text>
      </View>
      
      <View style={styles.dayTabsContainer}>
        <FlatList
          data={mealPlan}
          renderItem={renderDayTab}
          keyExtractor={item => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsList}
        />
      </View>
      
      <View style={styles.mealsContainer}>
        <Text style={styles.dayTitle}>{selectedDay}'s Meals</Text>
        {selectedDayPlan?.meals && (
          <FlatList
            data={selectedDayPlan.meals}
            renderItem={renderMeal}
            keyExtractor={(item, idx) => idx.toString()}
            contentContainerStyle={styles.mealsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={generateMealPlan}
        >
          <LinearGradient
            colors={['#33E4DB', '#00BBD3']}
            style={styles.generateGradient}
          >
            <Text style={styles.generateButtonText}>Generate New Plan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      <BottomNavBar navigation={navigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    backgroundColor: '#00BBD3',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    fontFamily: 'League Spartan',
    marginRight: 30,
  },
  backButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 30,
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555555',
    fontFamily: 'League Spartan',
  },
  dayTabsContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dayTabsList: {
    paddingHorizontal: 16,
  },
  dayTab: {
    marginRight: 12,
  },
  dayTabGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedDayTab: {
    borderColor: 'transparent',
  },
  dayTabText: {
    fontSize: 14,
    color: '#555555',
    fontFamily: 'League Spartan',
    fontWeight: '600',
  },
  selectedDayTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  mealsContainer: {
    flex: 1,
    padding: 20,
  },
  dayTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
    fontFamily: 'League Spartan',
  },
  mealsList: {
    paddingBottom: 100, // Account for buttons
  },
  mealCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  mealTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTypeGradient: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  mealType: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'League Spartan',
  },
  mealTime: {
    fontSize: 14,
    color: '#888888',
    fontFamily: 'League Spartan',
  },
  mealName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    fontFamily: 'League Spartan',
  },
  mealBenefits: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 10,
    fontFamily: 'League Spartan',
    lineHeight: 20,
  },
  mealMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealPortion: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'League Spartan',
  },
  mealCalories: {
    fontSize: 12,
    color: '#00BBD3',
    fontWeight: 'bold',
    fontFamily: 'League Spartan',
  },
  buttonContainer: {
     position: 'absolute',
     bottom: 90,
     left: 20,
     right: 20,
     flexDirection: 'row',
   },
  generateButton: {
    flex: 1,
  },
  generateGradient: {
     borderRadius: 12,
     padding: 14,
     alignItems: 'center',
   },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'League Spartan',
  },
});

export default MealPlan;