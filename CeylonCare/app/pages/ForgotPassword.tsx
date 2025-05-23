import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";

const ForgotPassword = ({ navigation }: any) => {
  const [email, setEmail] = useState("");

  const handleSendResetPasswordEmail = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }

    try {
      console.log("Sending password reset request...");
      
      const response = await fetch("http://172.20.10.14:5000/forgetPassword", {

        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const responseData = await response.json();
      console.log("Response from backend:", responseData);

      if (response.ok) {
        Alert.alert(
          "Success",
          "A password reset email has been sent to your email address."
        );
        navigation.navigate("Login");
      } else {
        throw new Error(responseData.error || "Failed to send reset email");
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#33E4DB", "#00BBD3"]} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require("../../assets/images/backIcon.png")}
            style={styles.backButtonImage}
          />
        </TouchableOpacity>
        <Text style={styles.headerText}>Set Password</Text>
      </LinearGradient>

      {/* Form */}
      <View style={styles.formContainer}>
        {/* Instructions */}
        <Text style={styles.instructions}>
          Please create a new password to secure your account.
        </Text>

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="********"
            secureTextEntry
          />
          <TouchableOpacity style={styles.eyeIcon}>
            <Ionicons name="eye" size={20} color="#13CAD6" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="********"
            secureTextEntry
          />
          <TouchableOpacity style={styles.eyeIcon}>
            <Ionicons name="eye" size={20} color="#13CAD6" />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={["#33E4DB", "#00BBD3"]}
          style={styles.resetButton}
        >
          <TouchableOpacity onPress={handleSendResetPasswordEmail}>
            <Text style={styles.resetButtonText}>Create New Password</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "white",
  },

  header: {
    height: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  backButton: {
    position: "absolute",
    left: 15,
    top: 30,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  backButtonImage: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },

  headerText: {
    textAlign: "center",
    fontSize: 24,
    color: "white",
    fontFamily: "League Spartan",
    fontWeight: "600",
  },

  formContainer: {
    margin: 20,
    alignItems: "center",
  },

  instructions: {
    fontSize: 12,
    color: "#252525",
    alignSelf: "flex-start",
    fontFamily: "League Spartan",
    fontWeight: 300,
    marginTop: 5,
    marginBottom: 35,
  },

  label: {
    alignSelf: "flex-start",
    fontSize: 20,
    color: "#252525",
    marginBottom: 10,
    fontWeight: "500",
    fontFamily: "League Spartan",
  },

  input: {
    backgroundColor: "#E9F6FE",
    paddingVertical: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E9F6FE",
    fontSize: 20,
    color: "#13CAD6",
    fontWeight: "400",
    fontFamily: "League Spartan",
  },

  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9F6FE",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E9F6FE",
    marginBottom: 15,
    paddingHorizontal: 15,
  },

  passwordInput: {
    flex: 1,
    fontSize: 20,
    color: "#13CAD6",
    fontFamily: "League Spartan",
  },

  eyeIcon: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  resetButton: {
    width: 270,
    height: 55,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 100,
    borderColor: "#33E4DB",
    borderWidth: 1,
    alignItems: "center",
    marginTop: 50,
    justifyContent: "center",
    gap: 10,
  },

  resetButtonText: {
    textAlign: "center",
    color: "white",
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "League Spartan",
  },
});

export default ForgotPassword;
