import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavBar from '../../BottomNavBar';

const mockHealthConditions = [
  'Diabetes', 
  'High Blood Pressure', 
  'Heart Disease', 
  'Cholesterol', 
  'Digestive Issues',
  'Weight Management',
  'Anemia',
  'Arthritis'
];

const exerciseFrequencies = [
  'Never',
  'Rarely (1-2 times/month)',
  'Sometimes (1-2 times/week)',
  'Often (3-4 times/week)',
  'Daily'
];

const HealthDataInput = ({ navigation }) => {
  const [healthData, setHealthData] = useState({
    age: '',
    weight: '',
    height: '',
    gender: '',
    exerciseFrequency: '',
    medicalConditions: [],
    allergies: '',
    dietaryPreferences: '',
    healthCondition: '', // For compatibility with existing backend
  });
  
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedExerciseFreq, setSelectedExerciseFreq] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  useEffect(() => {
    loadExistingHealthData();
  }, []);

  const loadExistingHealthData = async () => {
    try {
      setIsLoadingData(true);
      
      // First check local storage
      const localHealthData = await AsyncStorage.getItem('userHealthData');
      if (localHealthData) {
        const parsedData = JSON.parse(localHealthData);
        setHealthData(parsedData);
        setSelectedConditions(parsedData.medicalConditions || []);
        setSelectedExerciseFreq(parsedData.exerciseFrequency || '');
      }
      
      // Then fetch from backend
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const response = await fetch(`http://172.20.10.14:5000/healthData/${userId}`);
        if (response.ok) {
          const backendData = await response.json();
          if (Object.keys(backendData).length > 0) {
            // Merge backend data with any additional fields
            const mergedData = {
              ...healthData,
              ...backendData,
              medicalConditions: backendData.medicalConditions || []
            };
            setHealthData(mergedData);
            setSelectedConditions(backendData.medicalConditions || []);
            setSelectedExerciseFreq(backendData.exerciseFrequency || '');
          }
        }
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };
  
  const toggleCondition = (condition) => {
    let updatedConditions;
    if (selectedConditions.includes(condition)) {
      updatedConditions = selectedConditions.filter(c => c !== condition);
    } else {
      updatedConditions = [...selectedConditions, condition];
    }
    setSelectedConditions(updatedConditions);
    setHealthData({...healthData, medicalConditions: updatedConditions});
  };

  const selectExerciseFrequency = (frequency) => {
    setSelectedExerciseFreq(frequency);
    setHealthData({...healthData, exerciseFrequency: frequency});
  };
  
  const validateHealthData = () => {
    const requiredFields = ['age', 'weight', 'height', 'gender'];
    const missingFields = requiredFields.filter(field => !healthData[field]);
    
    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Information', 
        `Please fill in: ${missingFields.join(', ')}`
      );
      return false;
    }
    
    if (selectedConditions.length === 0) {
      Alert.alert(
        'Medical Conditions', 
        'Please select at least one health condition for personalized recommendations.'
      );
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateHealthData()) {
      return;
    }

    const updatedProfile = {
      ...healthData,
      medicalConditions: selectedConditions,
      exerciseFrequency: selectedExerciseFreq,
      healthCondition: selectedConditions.join(', '), // For backend compatibility
    };
    
    try {
      setIsLoading(true);
      
      // Save to local storage first
      await AsyncStorage.setItem('userHealthData', JSON.stringify(updatedProfile));
      
      // Save to backend
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const response = await fetch(`http://172.20.10.14:5000/healthData/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedProfile),
        });

        if (!response.ok) {
          throw new Error('Failed to save to backend');
        }
        
        console.log('Health data saved successfully:', updatedProfile);
        Alert.alert(
          'Success!', 
          'Your health profile has been saved successfully.',
          [
            { text: 'Continue', onPress: () => navigation.navigate('FoodRecommendations') }
          ]
        );
      } else {
        // No user ID - save locally and continue
        navigation.navigate('FoodRecommendations');
      }
    } catch (error) {
      console.error('Error saving health data:', error);
      Alert.alert(
        'Save Error', 
        'Failed to save to server, but data is saved locally. You can continue.',
        [
          { text: 'Continue Anyway', onPress: () => navigation.navigate('FoodRecommendations') },
          { text: 'Try Again', onPress: handleSave }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Data</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BBD3" />
          <Text style={styles.loadingText}>Loading your health data...</Text>
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
        <Text style={styles.headerTitle}>Health Data</Text>
      </View>
      
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Age *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your age"
            keyboardType="numeric"
            value={healthData.age}
            onChangeText={(text) => setHealthData({...healthData, age: text})}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Gender *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Male/Female/Other"
            value={healthData.gender}
            onChangeText={(text) => setHealthData({...healthData, gender: text})}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight (Kg) *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your weight"
            keyboardType="numeric"
            value={healthData.weight}
            onChangeText={(text) => setHealthData({...healthData, weight: text})}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Height (Cm) *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your height"
            keyboardType="numeric"
            value={healthData.height}
            onChangeText={(text) => setHealthData({...healthData, height: text})}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lifestyle Information</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Exercise Frequency</Text>
          <View style={styles.optionsContainer}>
            {exerciseFrequencies.map((frequency, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  styles.optionBadge,
                  selectedExerciseFreq === frequency && styles.optionBadgeSelected
                ]}
                onPress={() => selectExerciseFrequency(frequency)}
              >
                <Text 
                  style={[
                    styles.optionText,
                    selectedExerciseFreq === frequency && styles.optionTextSelected
                  ]}
                >
                  {frequency}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Medical Conditions *</Text>
          <Text style={styles.inputSubLabel}>Select all that apply</Text>
          <View style={styles.conditionsContainer}>
            {mockHealthConditions.map((condition, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  styles.conditionBadge,
                  selectedConditions.includes(condition) && styles.conditionBadgeSelected
                ]}
                onPress={() => toggleCondition(condition)}
              >
                <Text 
                  style={[
                    styles.conditionText,
                    selectedConditions.includes(condition) && styles.conditionTextSelected
                  ]}
                >
                  {condition}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Food Allergies</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter any food allergies (optional)"
            value={healthData.allergies}
            onChangeText={(text) => setHealthData({...healthData, allergies: text})}
            multiline
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Dietary Preferences</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Vegetarian, vegan, etc. (optional)"
            value={healthData.dietaryPreferences}
            onChangeText={(text) => setHealthData({...healthData, dietaryPreferences: text})}
            multiline
          />
        </View>
        
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          <LinearGradient 
            colors={isLoading ? ['#CCCCCC', '#999999'] : ['#33E4DB', '#00BBD3']} 
            style={styles.saveButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save and Continue</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
      
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
  formContainer: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: 'League Spartan',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
    fontFamily: 'League Spartan',
  },
  inputSubLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    fontFamily: 'League Spartan',
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    fontFamily: 'League Spartan',
    minHeight: 48,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  optionBadgeSelected: {
    backgroundColor: '#00BBD3',
    borderColor: '#00BBD3',
  },
  optionText: {
    fontSize: 14,
    color: '#555555',
    fontFamily: 'League Spartan',
  },
  optionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  conditionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  conditionBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  conditionBadgeSelected: {
    backgroundColor: '#00BBD3',
    borderColor: '#00BBD3',
  },
  conditionText: {
    fontSize: 14,
    color: '#555555',
    fontFamily: 'League Spartan',
  },
  conditionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  saveButton: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'League Spartan',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default HealthDataInput;