import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Button,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import the local default image
const defaultProfileImage = require("../../../assets/images/defaultProfileImage.png");

const ProfileDetails = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState({
    fullName: "",
    mobileNumber: "",
    email: "",
    profilePhoto: "",
  });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found");

      const response = await fetch(`http://172.20.10.14:5000/user/${userId}`);

      if (!response.ok)
        throw new Error(`Failed to fetch profile: ${response.statusText}`);

      const data = await response.json();
      setUserData(data);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) {
      return Alert.alert("Error", "User ID not found");
    }

    const formData = new FormData();
    formData.append("fullName", userData.fullName);
    formData.append("mobileNumber", userData.mobileNumber);

    // If the user has selected a photo, append it
    if (selectedPhoto) {
      formData.append("profilePhoto", {
        uri: selectedPhoto,
        name: "profile.jpg",
        type: "image/jpeg",
      });
    }

    try {
      const response = await fetch(`http://172.20.10.14:5000/user/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }
      Alert.alert("Success", "Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleChangePhoto = async () => {
    console.log("Change photo button clicked");
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("Permission status:", status);

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need permission to access your gallery."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      console.log("Image picker result:", result);

      if (!result.canceled && result.assets) {
        setSelectedPhoto(result.assets[0].uri);
        console.log("Selected photo URI:", result.assets[0].uri);
        setIsPhotoModalVisible(true);
      } else {
        console.log("No photo selected or user canceled.");
      }
    } catch (error) {
      console.error("Error during photo selection:", error.message);
      Alert.alert("Error", "Failed to select the photo.");
    }
  };

  const confirmPhotoUpload = async () => {
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) {
      return Alert.alert("Error", "User ID not found");
    }

    const formData = new FormData();
    if (selectedPhoto) {
      formData.append("profilePhoto", {
        uri: selectedPhoto,
        name: "profile.jpg",
        type: "image/jpeg",
      });
    }

    try {
      const response = await fetch(`http://172.20.10.14:5000/user/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedUser = await response.json();
      setUserData(updatedUser);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsPhotoModalVisible(false);
      setSelectedPhoto(null);
    }
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
      <Text style={styles.header}>Profile</Text>

      <TouchableOpacity
        style={styles.photoContainer}
        onPress={handleChangePhoto}
      >
        <Image
          source={
            userData.profilePhoto
              ? { uri: userData.profilePhoto }
              : defaultProfileImage // Use local default image
          }
          style={styles.profileImage}
        />
        <Text style={styles.changePhotoText}>Change Photo</Text>
      </TouchableOpacity>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={userData.fullName}
          editable={isEditing}
          onChangeText={(text) => setUserData({ ...userData, fullName: text })}
        />
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={userData.mobileNumber}
          editable={isEditing}
          keyboardType="phone-pad"
          onChangeText={(text) =>
            setUserData({ ...userData, mobileNumber: text })
          }
        />
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={userData.email}
          editable={false}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={isEditing ? handleUpdateProfile : () => setIsEditing(true)}
        >
          <Text style={styles.buttonText}>
            {isEditing ? "Save Changes" : "Edit Profile"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isPhotoModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <Image source={{ uri: selectedPhoto }} style={styles.modalImage} />
          <Text>Is this the photo you want to upload?</Text>
          <View style={styles.modalButtons}>
            <Button title="Confirm" onPress={confirmPhotoUpload} />
            <Button
              title="Cancel"
              onPress={() => setIsPhotoModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  photoContainer: { alignItems: "center", marginBottom: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  changePhotoText: { marginTop: 10, color: "#00BBD3" },
  form: { marginBottom: 20 },
  label: { fontSize: 16, marginBottom: 5 },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderColor: "#ccc",
    borderWidth: 1,
  },
  button: {
    backgroundColor: "#00BBD3",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalImage: { width: 200, height: 200, marginBottom: 20 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default ProfileDetails;
