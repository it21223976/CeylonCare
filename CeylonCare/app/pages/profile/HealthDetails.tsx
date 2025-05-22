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

const HealthDetails = ({ navigation }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [healthData, setHealthData] = useState({
    gender: "",
    age: "",
    weight: "",
    height: "",
    exerciseFrequency: "",
    healthCondition: "",
  });

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
        `http://192.168.8.134:5000/healthData/${userId}`
      );

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch health data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Fetched health data:", data);

      // Ensure all fields are available for rendering
      setHealthData({
        gender: data.gender || "",
        age: data.age || "",
        weight: data.weight || "",
        height: data.height || "",
        exerciseFrequency: data.exerciseFrequency || "",
        healthCondition: data.healthCondition || "",
      });
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
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateHealthData = async () => {
    console.log("Updating health data...");
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) {
      console.error("User ID not found in AsyncStorage");
      return Alert.alert("Error", "User ID not found");
    }

    try {
      const response = await fetch(
        `http://192.168.8.134:5000/healthData/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(healthData),
        }
      );

      console.log("Update response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to update health data: ${response.statusText}`);
      }

      Alert.alert("Success", "Health data updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating health data:", error.message);
      Alert.alert("Error", "Failed to update health data");
    }
  };

  // const handleDeleteHealthData = async () => {
  //   console.log("Deleting health data...");
  //   const userId = await AsyncStorage.getItem("userId");
  //   if (!userId) {
  //     console.error("User ID not found in AsyncStorage");
  //     return Alert.alert("Error", "User ID not found");
  //   }

  //   try {
  //     const response = await fetch(
  //       `http://192.168.8.134:5000/healthData/${userId}`,
  //       {
  //         method: "DELETE",
  //       }
  //     );

  //     console.log("Delete response status:", response.status);

  //     if (!response.ok) {
  //       throw new Error(`Failed to delete health data: ${response.statusText}`);
  //     }

  //     Alert.alert("Success", "Health data deleted successfully!");
  //     setHealthData({
  //       gender: "",
  //       age: "",
  //       weight: "",
  //       height: "",
  //       exerciseFrequency: "",
  //       healthCondition: "",
  //     });
  //   } catch (error) {
  //     console.error("Error deleting health data:", error.message);
  //     Alert.alert("Error", "Failed to delete health data");
  //   }
  // };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BBD3" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Health Data</Text>
      <View style={styles.form}>
        {Object.keys(healthData).map((key) => (
          <View key={key} style={styles.inputContainer}>
            <Text style={styles.label}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
            <TextInput
              style={[styles.input, isEditing && styles.editableInput]}
              value={healthData[key]}
              editable={isEditing}
              onChangeText={(text) =>
                setHealthData({ ...healthData, [key]: text })
              }
              keyboardType={
                key === "age" || key === "weight" || key === "height"
                  ? "numeric"
                  : "default"
              }
            />
          </View>
        ))}

        <TouchableOpacity
          style={styles.button}
          onPress={
            isEditing ? handleUpdateHealthData : () => setIsEditing(true)
          }
        >
          <Text style={styles.buttonText}>
            {isEditing ? "Save" : "Edit Profile"}
          </Text>
        </TouchableOpacity>

        {/* {isEditing && (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDeleteHealthData}
          >
            <Text style={styles.buttonText}>Delete Data</Text>
          </TouchableOpacity>
        )} */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: "#fff" },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  form: { marginBottom: 20 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 16, marginBottom: 5 },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 5,
    borderColor: "#ccc",
    borderWidth: 1,
  },
  editableInput: { backgroundColor: "#fff", borderColor: "#00BBD3" },
  button: {
    backgroundColor: "#00BBD3",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  deleteButton: { backgroundColor: "#FF6347" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default HealthDetails;
