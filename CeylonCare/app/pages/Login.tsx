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
import AsyncStorage from "@react-native-async-storage/async-storage";

const Login = ({ navigation }: any) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in both email and password.");
      return;
    }
  
    try {
      console.log("Sending login request...");

      const response = await fetch("http://192.168.8.134:5000/login", {

        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Login error response:", errorData);
        throw new Error(errorData.error || "Login failed");
      }
  
      const responseData = await response.json();
      const { user, loginTimestamp } = responseData;
  
      console.log("Login successful. Storing session data...");
  
      // Validate loginTimestamp before storing
      if (!loginTimestamp) {
        console.warn("No login timestamp received from server.");
      } else {
        await AsyncStorage.setItem("loginTimestamp", loginTimestamp);
      }
  
      // Store userId safely
      await AsyncStorage.setItem("userId", user.uid);
  
      Alert.alert("Success", "Logged in successfully!");
      navigation.navigate("Onboarding");
    } catch (error) {
      console.error("Login error:", error.message);
  
      // Clear any existing session data to avoid inconsistencies
      await AsyncStorage.removeItem("userId");
      await AsyncStorage.removeItem("loginTimestamp");
  
      Alert.alert("Error", error.message);
    }
  };  

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
        <Text style={styles.headerText}>Log In</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <Text style={styles.welcome}>Welcome</Text>
        <Text style={styles.subHeader}>
          Enter your credentials to access your account.
        </Text>

        <Text style={styles.label}>Email or Mobile Number</Text>
        <TextInput
          style={styles.input}
          placeholder="example@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="********"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#13CAD6"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.forgotPassword}>Forget Password</Text>
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <LinearGradient
            colors={["#33E4DB", "#00BBD3"]}
            style={styles.loginButton}
          >
            <TouchableOpacity onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <Text style={styles.footer}>
          Don’t have an account?{" "}
          <Text
            style={styles.link}
            onPress={() => navigation.navigate("Register")}
          >
            Sign Up
          </Text>
        </Text>
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
    margin: 25,
  },

  welcome: {
    fontSize: 24,
    color: "#13CAD6",
    fontWeight: 600,
    fontFamily: "League Spartan",
    marginBottom: 15,
  },

  subHeader: {
    fontSize: 12,
    color: "#252525",
    fontFamily: "League Spartan",
    fontWeight: 300,
    marginBottom: 20,
    lineHeight: 15,
  },

  label: {
    fontSize: 20,
    color: "#252525",
    marginTop: 25,
    marginBottom: 10,
    fontWeight: "500",
    fontFamily: "League Spartan",
  },

  input: {
    backgroundColor: "#E9F6FE",
    paddingVertical: 10,
    paddingHorizontal: 15,
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
    paddingEnd: 20,
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

  forgotPassword: {
    fontSize: 12,
    fontFamily: "League Spartan",
    color: "#13CAD6",
    fontWeight: "500",
    marginTop: 15,
    marginBottom: 50,
    textAlign: "right",
    alignSelf: "flex-end",
  },

  footerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  loginButton: {
    width: 190,
    height: 50,
    borderRadius: 100,
    borderColor: "#33E4DB",
    borderWidth: 1,
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },

  loginButtonText: {
    textAlign: "center",
    color: "white",
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "League Spartan",
  },

  footer: {
    fontFamily: "League Spartan",
    fontWeight: 300,
    fontSize: 12,
    color: "#252525",
    textAlign: "center",
    marginTop: 175,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  link: {
    color: "#13CAD6",
    fontWeight: 500,
  },
});

export default Login;
