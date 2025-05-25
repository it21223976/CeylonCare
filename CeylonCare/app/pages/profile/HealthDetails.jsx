import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';

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

const HealthDetails = ({ navigation }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [healthData, setHealthData] = useState({
    gender: "",
    age: "",
    weight: "",
    height: "",
    exerciseFrequency: "",
    healthCondition: "",
    medicalConditions: [],
    allergies: "",
    dietaryPreferences: "",
  });

  const [selectedConditions, setSelectedConditions] = useState([]);

  useEffect(() => {
    console.log("Component mounted, fetching health data...");
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found in AsyncStorage");

      console.log("Fetching health data for user ID:", userId);

      const response = await fetch(
        `http://172.20.10.14:5000/healthData/${userId}`
      );

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch health data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Fetched health data:", data);

      // Ensure all fields are available for rendering
      const fetchedData = {
        gender: data.gender || "",
        age: data.age || "",
        weight: data.weight || "",
        height: data.height || "",
        exerciseFrequency: data.exerciseFrequency || "",
        healthCondition: data.healthCondition || "",
        medicalConditions: data.medicalConditions || [],
        allergies: data.allergies || "",
        dietaryPreferences: data.dietaryPreferences || "",
      };

      setHealthData(fetchedData);
      setSelectedConditions(data.medicalConditions || []);
    } catch (error) {
      console.error("Error fetching health data:", error.message);
      // If no data is found, reset the healthData state to default
      setHealthData({
        gender: "",
        age: "",
        weight: "",
        height: "",
        exerciseFrequency: "",
        healthCondition: "",
        medicalConditions: [],
        allergies: "",
        dietaryPreferences: "",
      });
      setSelectedConditions([]);
    } finally {
      setIsLoading(false);
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
    setHealthData({
      ...healthData, 
      medicalConditions: updatedConditions,
      healthCondition: updatedConditions.join(', ') // For backend compatibility
    });
  };

  const handleUpdateHealthData = async () => {
    console.log("Updating health data...");
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) {
      console.error("User ID not found in AsyncStorage");
      return Alert.alert("Error", "User ID not found");
    }

    try {
      setIsSaving(true);

      const updatedData = {
        ...healthData,
        medicalConditions: selectedConditions,
        healthCondition: selectedConditions.join(', ')
      };

      const response = await fetch(
        `http://172.20.10.14:5000/healthData/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        }
      );

      console.log("Update response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to update health data: ${response.statusText}`);
      }

      // Also update local storage
      await AsyncStorage.setItem('userHealthData', JSON.stringify(updatedData));

      Alert.alert("Success", "Health data updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating health data:", error.message);
      Alert.alert("Error", "Failed to update health data");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BBD3" />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Health Data</Text>
      
      <View style={styles.form}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={[styles.input, isEditing && styles.editableInput]}
              value={healthData.age}
              editable={isEditing}
              onChangeText={(text) =>
                setHealthData({ ...healthData, age: text })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Gender</Text>
            <TextInput
              style={[styles.input, isEditing && styles.editableInput]}
              value={healthData.gender}
              editable={isEditing}
              onChangeText={(text) =>
                setHealthData({ ...healthData, gender: text })
              }
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Weight (Kg)</Text>
            <TextInput
              style={[styles.input, isEditing && styles.editableInput]}
              value={healthData.weight}
              editable={isEditing}
              onChangeText={(text) =>
                setHealthData({ ...healthData, weight: text })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Height (Cm)</Text>
            <TextInput
              style={[styles.input, isEditing && styles.editableInput]}
              value={healthData.height}
              editable={isEditing}
              onChangeText={(text) =>
                setHealthData({ ...healthData, height: text })
              }
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Lifestyle Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifestyle Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Exercise Frequency</Text>
            {isEditing ? (
              <View style={styles.optionsContainer}>
                {exerciseFrequencies.map((frequency, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={[
                      styles.optionBadge,
                      healthData.exerciseFrequency === frequency && styles.optionBadgeSelected
                    ]}
                    onPress={() => setHealthData({...healthData, exerciseFrequency: frequency})}
                  >
                    <Text 
                      style={[
                        styles.optionText,
                        healthData.exerciseFrequency === frequency && styles.optionTextSelected
                      ]}
                    >
                      {frequency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.displayValue}>{healthData.exerciseFrequency || 'Not specified'}</Text>
            )}
          </View>
        </View>

        {/* Medical Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Medical Conditions</Text>
            {isEditing ? (
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
            ) : (
              <View style={styles.conditionsDisplay}>
                {selectedConditions.length > 0 ? (
                  selectedConditions.map((condition, index) => (
                    <View key={index} style={styles.conditionDisplayBadge}>
                      <Text style={styles.conditionDisplayText}>{condition}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.displayValue}>No conditions specified</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Food Allergies</Text>
            <TextInput
              style={[styles.input, styles.multilineInput, isEditing && styles.editableInput]}
              value={healthData.allergies}
              editable={isEditing}
              multiline
              placeholder="Enter any food allergies"
              onChangeText={(text) =>
                setHealthData({ ...healthData, allergies: text })
              }
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Dietary Preferences</Text>
            <TextInput
              style={[styles.input, styles.multilineInput, isEditing && styles.editableInput]}
              value={healthData.dietaryPreferences}
              editable={isEditing}
              multiline
              placeholder="Vegetarian, vegan, etc."
              onChangeText={(text) =>
                setHealthData({ ...healthData, dietaryPreferences: text })
              }
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={
            isEditing ? handleUpdateHealthData : () => setIsEditing(true)
          }
          disabled={isSaving}
        >
          <LinearGradient
            colors={isSaving ? ['#CCCCCC', '#999999'] : ['#33E4DB', '#00BBD3']}
            style={styles.button}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.buttonText}>
                {isEditing ? "Save Changes" : "Edit Profile"}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    padding: 20, 
    backgroundColor: "#fff" 
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
    color: "#333333",
    fontFamily: "League Spartan",
  },
  form: { 
    marginBottom: 20 
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00BBD3",
    marginBottom: 16,
    fontFamily: "League Spartan",
  },
  inputContainer: { 
    marginBottom: 16 
  },
  label: { 
    fontSize: 16, 
    fontWeight: "600",
    marginBottom: 8,
    color: "#333333",
    fontFamily: "League Spartan",
  },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    borderColor: "#ccc",
    borderWidth: 1,
    fontSize: 16,
    fontFamily: "League Spartan",
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editableInput: { 
    backgroundColor: "#fff", 
    borderColor: "#00BBD3",
    borderWidth: 2,
  },
  displayValue: {
    fontSize: 16,
    color: "#666666",
    fontStyle: "italic",
    fontFamily: "League Spartan",
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
 conditionsDisplay: {
   flexDirection: 'row',
   flexWrap: 'wrap',
 },
 conditionDisplayBadge: {
   backgroundColor: '#E8FFF6',
   borderRadius: 16,
   paddingVertical: 6,
   paddingHorizontal: 12,
   margin: 4,
   borderWidth: 1,
   borderColor: '#00BBD3',
 },
 conditionDisplayText: {
   fontSize: 12,
   color: '#00BBD3',
   fontWeight: '600',
   fontFamily: 'League Spartan',
 },
 buttonContainer: {
   marginTop: 20,
 },
 button: {
   padding: 16,
   borderRadius: 12,
   alignItems: "center",
 },
 buttonText: { 
   color: "#fff", 
   fontSize: 18, 
   fontWeight: "bold",
   fontFamily: "League Spartan",
 },
 loadingContainer: { 
   flex: 1, 
   justifyContent: "center", 
   alignItems: "center" 
 },
 loadingText: {
   marginTop: 16,
   fontSize: 16,
   color: "#555555",
   fontFamily: "League Spartan",
 },
});

export default HealthDetails;