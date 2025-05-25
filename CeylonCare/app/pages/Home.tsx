import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import BottomNavBar from "../BottomNavBar";

const { width } = Dimensions.get("window");

const buttonData = [
  {
    id: "1",
    title: "Check Me",
    description: "Answer Our Question And Check Your Risk Of Diagnosed",
    icon: require("../../assets/images/prediction_home 1.png"),
    navigateTo: "Splash",
  },
  {
    id: "2",
    title: "Meal Plan",
    description: "Sri Lankan healthy food recommendations for your well-being",
    icon: require("../../assets/images/food_home 1.png"),
    navigateTo: "HealthyFoodMain", // CHANGE THIS LINE
  },
  {
    id: "3",
    title: "AR Trainer",
    description: "Train smarter with AR guidance!",
    icon: require("../../assets/images/ar_home 1.png"),
    navigateTo: "TherapyRecommendations",
  },
  {
    id: "4",
    title: "AI Chatbot",
    description: "#####",
    icon: require("../../assets/images/ai_home 1.png"),
    navigateTo: "ChatScreen",
  },
];

const defaultProfileImage = require("../../assets/images/defaultProfileImage.png");

const Home = ({ navigation }: any) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userData, setUserData] = useState({ fullName: "", profilePhoto: "" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      console.log("Fetching user profile...");
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found");

      const response = await fetch(`http://172.20.10.14:5000/user/${userId}`);

      if (!response.ok) throw new Error("Failed to fetch user profile");

      const data = await response.json();
      console.log("User profile fetched successfully:", data);
      setUserData(data);
    } catch (error) {
      console.error("Error fetching user profile:", error.message);
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => navigation.navigate(item.navigateTo)}
    >
      <LinearGradient colors={["#33E4DB", "#00BBD3"]} style={styles.card}>
        <Image source={item.icon} style={styles.icon} resizeMode="contain" />
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription}>{item.description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / (width * 0.8));
    setCurrentIndex(index);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BBD3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Welcome Section */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, Welcome Back</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Image
            source={
              userData.profilePhoto
                ? { uri: userData.profilePhoto }
                : defaultProfileImage
            }
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>
            {userData.fullName || "User Name"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card Slider */}
      <FlatList
        data={buttonData}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToAlignment="center"
        contentContainerStyle={styles.carouselContainer}
        decelerationRate="fast"
        snapToInterval={width * 0.8}
        onScroll={handleScroll}
      />

      {/* Pagination */}
      <View style={styles.pagination}>
        {buttonData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>

      {/* Bottom Navigation Bar */}
      <BottomNavBar navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
  },
  greeting: {
    width: 150,
    fontSize: 32,
    fontWeight: "700",
    color: "#3CA19C",
    textAlign: "center",
    fontFamily: "League Spartan",
    textTransform: "capitalize",
  },
  profileImage: {
    width: 83,
    height: 74,
    borderRadius: 90,
    marginVertical: 10,
  },
  profileName: {
    fontFamily: "League Spartan",
    fontSize: 14,
    fontWeight: "700",
    color: "#252525",
    textTransform: "capitalize",
  },
  carouselContainer: {
    marginTop: 20,
  },
  cardContainer: {
    width: width * 0.8,
    marginHorizontal: 20,
  },
  card: {
    width: 350,
    height: 300,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    elevation: 4,
    boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
  },
  icon: {
    width: 120,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: "600",
    color: "#F7FFFE",
    fontFamily: "League Spartan",
    marginBottom: 10,
    textAlign: "center",
  },
  cardDescription: {
    width: 150,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "League Spartan",
    color: "white",
    textAlign: "center",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E9F6FE",
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: "#13CAD6",
  },
  inactiveDot: {
    backgroundColor: "#E9F6FE",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default Home;
