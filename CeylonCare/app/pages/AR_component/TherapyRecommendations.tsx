import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import BottomNavBar from "../../BottomNavBar";
import { LinearGradient } from "expo-linear-gradient";

// Define props for navigation
type RootStackParamList = {
  TherapyRecommendations: undefined;
  TherapyDetails: { therapyName: string };
};

type TherapyRecommendationsProps = {
  navigation: StackNavigationProp<RootStackParamList, "TherapyRecommendations">;
};

// Define Type for Therapy Item
type TherapyItem = string;

// Therapy Recommendations Component
const TherapyRecommendations: React.FC<TherapyRecommendationsProps> = ({
  navigation,
}) => {
  const [recommendations, setRecommendations] = useState<TherapyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch therapy recommendations
  useEffect(() => {
    fetchTherapyRecommendations();
  }, []);

  const fetchTherapyRecommendations = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert("Error", "User ID not found. Please log in again.");
        return;
      }

      const response = await axios.get<{ recommendations: TherapyItem[] }>(
        `http://192.168.8.134:5000/ar_therapy/${userId}`
      );

      if (!response.data || !response.data.recommendations.length) {
        throw new Error("Invalid API response: No recommendations found");
      }

      setRecommendations(response.data.recommendations);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch therapy recommendations.");
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to Therapy Details page
  const handleTherapySelect = (therapyName: TherapyItem) => {
    navigation.navigate("TherapyDetails", { therapyName });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BBD3" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => navigation.goBack()}
                    >
                      <Ionicons name="chevron-back" size={30} color="#00BBD3" />
                    </TouchableOpacity>
      
            <LinearGradient colors={["#33E4DB", "#00BBD3"]} style={styles.headerContainer}>
                            <Text style={styles.headerText}>Schedules for you</Text>
                  </LinearGradient>

      <ScrollView contentContainerStyle={styles.container}>
        {recommendations.length === 0 ? (
          <Text style={styles.noDataText}>No recommendations found.</Text>
        ) : (
          recommendations.map((therapyName, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => handleTherapySelect(therapyName)}
            >
              <Text style={styles.cardTitle}>Option {index + 1}</Text>
              <Text style={styles.cardSubtitle}>{therapyName}</Text>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <BottomNavBar navigation={navigation} />
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#F8FBFF",
    marginBottom: 20
  },
  backButton: {
    color: "#00BBD3",
    marginRight: 20,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00BBD3",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    textAlign: "center",
    fontSize: 16,
    color: "gray",
    marginTop: 20,
  },
  card: {
    backgroundColor: "#E6F7FF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginVertical: 5,
  },
  cardArrow: {
    fontSize: 25,
    color: "#00BBD3",
    alignSelf: "flex-end",
  },
});

export default TherapyRecommendations;
