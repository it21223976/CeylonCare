import React from "react";
import { StyleSheet, View, TouchableOpacity, Image } from "react-native";

const BottomNavBar = ({ navigation }: any) => {
  return (
    <View style={styles.navBar}>
      {/* Home */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate("Splash")}
      >
        <Image
          source={require("../assets/images/home_nav.png")}
          style={styles.icon}
        />
      </TouchableOpacity>

      {/* Meal Plan */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate("HealthyFoodMain")}
      >
        <Image
          source={require("../assets/images/food_nav.png")}
          style={styles.icon}
        />
      </TouchableOpacity>

      {/* AR Trainer */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate("TherapyRecommendations")}
      >
        <Image
          source={require("../assets/images/ar_nav.png")}
          style={styles.icon}
        />
      </TouchableOpacity>

      {/* AI Chatbot */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate("ChatScreen")}
      >
        <Image
          source={require("../assets/images/ai_nav.png")}
          style={styles.icon}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    bottom: -20,
    height: 67,
    backgroundColor: "#E9F6FE",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
  },
  icon: {
    width: 25,
    height: 25,
  },
});

export default BottomNavBar;
