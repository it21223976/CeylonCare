import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from "moment";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";

const Register = ({ navigation }: any) => {
  const [fullName, setFullName] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileError, setMobileError] = useState("");

  const [dob, setDob] = useState("");
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const validateEmail = (input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex for validating email
    if (emailRegex.test(input)) {
      setEmailError(""); // Clear error if valid
    } else {
      setEmailError("Please enter a valid email address");
    }
    setEmail(input);
  };

  const validateMobileNumber = (input: string) => {
    const mobileRegex = /^[0-9]{10}$/; // Regex for exactly 10 numeric digits
    if (mobileRegex.test(input)) {
      setMobileError(""); // Clear error if valid
    } else {
      setMobileError("Please enter a valid 10-digit mobile number");
    }
    setMobileNumber(input);
  };

  const handleSignUp = async () => {
    console.log("Sign Up button clicked");

    if (!fullName || !password || !email || !mobileNumber || !dob) {
      Alert.alert("Error", "Please fill in all fields");
      console.log("Validation failed: missing fields");
      return;
    }

    if (emailError) {
      Alert.alert("Error", emailError); // Prevent signup if there's an email error
      console.log("Validation failed: invalid email");
      return;
    }

    try {
      console.log("Sending request to backend...");

      const response = await fetch("http://192.168.8.134:5000/register", {

        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, fullName, mobileNumber, dob }),
      });

      const responseData = await response.json();
      console.log("Response from backend:", responseData);

      if (response.ok) {
        Alert.alert("Success", "Account created successfully");
        navigation.navigate("Login");
      } else {
        throw new Error(responseData.error || "Registration failed");
      }
    } catch (error: any) {
      console.error("Error in Sign Up:", error.message);
      Alert.alert("Error", error.message);
    }
  };

  const handleConfirmDate = (date: Date) => {
    setDob(moment(date).format("DD / MM / YYYY"));
    setDatePickerVisibility(false);
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
        <Text style={styles.headerText}>New Account</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="John Doe"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Password</Text>
        <View style={(styles.input, styles.passwordInputContainer)}>
          <TextInput
            style={[styles.passwordInput]}
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

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="example@example.com"
          value={email}
          onChangeText={validateEmail}
          keyboardType="email-address"
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <Text style={styles.label}>Mobile Number</Text>
        <TextInput
          style={styles.input}
          placeholder="0777777777"
          keyboardType="phone-pad"
          value={mobileNumber}
          onChangeText={validateMobileNumber}
        />
        {mobileError ? (
          <Text style={styles.errorText}>{mobileError}</Text>
        ) : null}
        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setDatePickerVisibility(true)}
        >
          <Text style={{ color: dob ? "#13CAD6" : "#A9A9A9" }}>
            {dob || "DD / MM / YYYY"}
          </Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={() => setDatePickerVisibility(false)}
        />

        <View style={styles.footerContainer}>
          <Text style={styles.terms}>
            By continuing, you agree to{" "}
            <Text
              style={styles.link}
              onPress={() => navigation.navigate("PrivacyPolicy")}
            >
              Terms of Use
            </Text>{" "}
            and{" "}
            <Text
              style={styles.link}
              onPress={() => navigation.navigate("PrivacyPolicy")}
            >
              Privacy Policy
            </Text>
            .
          </Text>

          <LinearGradient
            colors={["#33E4DB", "#00BBD3"]}
            style={styles.signUpButton}
          >
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <Text style={styles.footer}>
          Already have an account?{" "}
          <Text
            style={styles.link}
            onPress={() => navigation.navigate("Login")}
          >
            Log In
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

  label: {
    fontSize: 20,
    color: "#252525",
    marginBottom: 5,
    fontWeight: "500",
    fontFamily: "League Spartan",
  },

  input: {
    backgroundColor: "#E9F6FE",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E9F6FE",
    marginBottom: 15,
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

  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 10,
  },

  footerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  terms: {
    width: 200,
    fontSize: 12,
    color: "#252525",
    textAlign: "center",
    marginTop: 15,
    marginBottom: 25,
    fontFamily: "League Spartan",
    fontWeight: 300,
  },

  link: {
    color: "#13CAD6",
    fontWeight: 500,
  },

  signUpButton: {
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

  signUpButtonText: {
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
    marginTop: 65,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Register;
