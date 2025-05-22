import React, { useEffect, useState } from "react";
import { 
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform, Pressable, 
  TouchableOpacity
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import { WebView } from "react-native-webview";
import * as ScreenOrientation from 'expo-screen-orientation';
import BottomNavBar from "../../BottomNavBar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// Define Navigation Params Type
type RootStackParamList = {
  TherapyDetails: { therapyName: string };
  ARAvatarScreen: { arPoseUrl: string; therapyName: string };
};

// Define Props Type
type TherapyDetailsScreenProps = {
  route: RouteProp<RootStackParamList, "TherapyDetails">;
  navigation: any;
};

// Define Therapy Details Response Type
type TherapyDetailsResponse = {
  name: string;
  description: string;
  ar_pose: string;
  reference_video?: string;
  steps: string[];
  benefits: string[];
};

const TherapyDetails: React.FC<TherapyDetailsScreenProps> = ({ route, navigation }) => {
  const { therapyName } = route.params || { therapyName: "Default Therapy" };
  const [therapyDetails, setTherapyDetails] = useState<TherapyDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // Ensure portrait orientation on mount
  useEffect(() => {
    const setPortraitOrientation = async () => {
      try {
        console.log('[DEBUG] Ensuring portrait orientation for TherapyDetails');
        const currentOrientation = await ScreenOrientation.getOrientationAsync();
        console.log('[DEBUG] Current orientation on mount:', currentOrientation);
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        const newOrientation = await ScreenOrientation.getOrientationAsync();
        console.log('[INFO] Orientation set to portrait for TherapyDetails, new orientation:', newOrientation);
      } catch (error) {
        console.error('[ERROR] Failed to set portrait orientation:', error.message);
        console.log('[DEBUG] Orientation set error details:', JSON.stringify({ message: error.message, stack: error.stack }, null, 2));
      }
    };

    setPortraitOrientation();
  }, []);

  useEffect(() => {
    fetchTherapyDetails();
  }, [therapyName]);

  // Fetch therapy details from API
  const fetchTherapyDetails = async () => {
    setIsLoading(true);
    setError(null);
    console.log(`[INFO] Starting fetch for therapy: ${therapyName}`);

    try {
      const normalizedTherapyName = therapyName.trim().replace(/%20/g, " ").replace(/-/g, " ");
      console.log(`[DEBUG] Normalized therapy name: ${normalizedTherapyName}`);

      const requestUrl = `http://192.168.8.134:5000/therapy_details/${encodeURIComponent(normalizedTherapyName)}`;

      console.log(`[DEBUG] Request URL: ${requestUrl}`);

      const response = await axios.get(requestUrl, { timeout: 10000 });
      console.log(`[DEBUG] API Response Status: ${response.status}`);
      console.log(`[DEBUG] API Response Data: ${JSON.stringify(response.data, null, 2)}`);

      if (!response.data) throw new Error("Empty API response");
      const data = response.data as TherapyDetailsResponse;
      if (!data.name || !data.description || !data.steps) throw new Error("Incomplete therapy data");

      console.log(`[DEBUG] Validated therapy data: ${JSON.stringify(data, null, 2)}`);
      setTherapyDetails(data);

      if (data.reference_video) {
        console.log(`[INFO] Found reference video URL: ${data.reference_video}`);
        await resolveVideoUri(data.reference_video);
      } else {
        console.log(`[WARN] No reference video provided in therapy data`);
      }
    } catch (err) {
      console.error(`[ERROR] Fetch failed: ${err.message}`);
      console.log(`[DEBUG] Error details: ${JSON.stringify({ message: err.message, code: err.code, stack: err.stack }, null, 2)}`);
      setError(err.response?.status === 404 ? `Therapy "${therapyName}" not found.` : "Failed to load therapy details.");
      Alert.alert("Error", error || "Failed to load therapy details.");
    } finally {
      setIsLoading(false);
      console.log(`[INFO] Fetch completed, isLoading: ${isLoading}`);
    }
  };

  // Resolve and validate video URI
  const resolveVideoUri = async (referenceVideo: string) => {
    console.log(`[INFO] Resolving video URI: ${referenceVideo}`);
    try {
      if (!referenceVideo.startsWith("http")) {
        throw new Error("Video URI must be a remote HTTP/HTTPS URL");
      }

      console.log(`[DEBUG] Checking URL accessibility: ${referenceVideo}`);
      const response = await fetch(referenceVideo, { method: "HEAD", timeout: 5000 });
      console.log(`[DEBUG] HTTP Status: ${response.status}`);
      if (response.status !== 200) throw new Error(`URL returned status ${response.status}`);

      const contentType = response.headers.get("content-type");
      console.log(`[DEBUG] Content-Type received: ${contentType}`);
      if (!contentType?.includes("video")) {
        console.warn(`[WARN] Invalid Content-Type: ${contentType}. Expected video/*`);
        throw new Error("URL does not serve a video file");
      }

      console.log(`[DEBUG] Response headers: ${JSON.stringify([...response.headers], null, 2)}`);
      setVideoUri(referenceVideo);
      console.log(`[INFO] Video URI validated and set: ${referenceVideo}`);
    } catch (err) {
      console.error(`[ERROR] URI resolution failed: ${err.message}`);
      console.log(`[DEBUG] URI error details: ${JSON.stringify({ message: err.message, stack: err.stack }, null, 2)}`);
      setError(`Video URI error: ${err.message}`);
      Alert.alert("Video Error", `Cannot load video: ${err.message}`);
    }
  };

  // Generate HTML for WebView with enhanced debugging
  const getVideoHtml = (uri: string) => {
    console.log(`[DEBUG] Generating WebView HTML for URI: ${uri}`);
    return `
      <html>
        <body style="margin:0; background-color:#000;">
          <video 
            id="videoPlayer"
            style="width:100%; height:100%;"
            controls
            playsinline
            src="${uri}"
            onplay="console.log('Video playing'); window.ReactNativeWebView.postMessage('Video playing')"
            onerror="console.log('Video error: ' + (this.error ? this.error.message : 'Unknown')); window.ReactNativeWebView.postMessage('Video error: ' + (this.error ? this.error.message : 'Unknown'))"
          >
            Video not supported.
          </video>
          <script>
            const video = document.getElementById('videoPlayer');
            video.addEventListener('error', (e) => {
              window.ReactNativeWebView.postMessage('Video error: ' + (video.error ? video.error.message : 'Unknown'));
            });
            video.addEventListener('play', () => window.ReactNativeWebView.postMessage('Video playing'));
            video.addEventListener('loadedmetadata', () => window.ReactNativeWebView.postMessage('Metadata loaded: ' + video.duration));
            video.addEventListener('loadstart', () => window.ReactNativeWebView.postMessage('Load started'));
            video.addEventListener('loadeddata', () => window.ReactNativeWebView.postMessage('Data loaded'));
            video.addEventListener('playing', () => window.ReactNativeWebView.postMessage('Video actively playing'));
            video.addEventListener('pause', () => window.ReactNativeWebView.postMessage('Video paused'));
            video.addEventListener('ended', () => window.ReactNativeWebView.postMessage('Video ended'));
          </script>
        </body>
      </html>
    `;
  };

  // Navigate to AR Avatar Screen
  const handleStartARAvatar = () => {
    if (!therapyDetails?.ar_pose) {
      console.warn(`[WARN] No ar_pose URL found for ${therapyName}`);
      Alert.alert("Error", "AR pose data not available for this therapy.");
      return;
    }

    console.log(`[INFO] Initiating navigation to ARAvatarScreen with ar_pose: ${therapyDetails.ar_pose} and therapyName: ${therapyName}`);
    try {
      navigation.navigate("ARAvatarScreen", {
        arPoseUrl: therapyDetails.ar_pose,
        therapyName: therapyName,
      });
      console.log(`[DEBUG] Navigation to ARAvatarScreen attempted successfully`);
    } catch (err) {
      console.error(`[ERROR] Navigation failed: ${err.message}`);
      console.log(`[DEBUG] Navigation error details: ${JSON.stringify({ message: err.message, stack: err.stack }, null, 2)}`);
      Alert.alert("Navigation Error", "Failed to navigate to AR Avatar screen.");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BBD3" />
        <Text style={styles.debugText}>Loading therapy details...</Text>
      </View>
    );
  }

  const videoSource = videoUri ? { html: getVideoHtml(videoUri) } : null;
  console.log(`[DEBUG] Final video source: ${JSON.stringify(videoSource, null, 2)}`);
  console.log(`[DEBUG] Platform: ${Platform.OS}, Device API: ${Platform.Version}`);

  return (
    <View style={styles.wrapper}>
      {therapyDetails ? (
          <>
          <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-back" size={30} color="#00BBD3" />
              </TouchableOpacity>

      <LinearGradient colors={["#33E4DB", "#00BBD3"]} style={styles.headerContainer}>
                      <Text style={styles.headerText}>{therapyDetails.name}</Text>
            </LinearGradient>

      <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.description}>{therapyDetails.description}</Text>

            {videoUri && (
              <View style={styles.videoContainer}>
                <Text style={styles.sectionTitle}>Reference Video</Text>
                <WebView source={{ html: getVideoHtml(videoUri) }} style={styles.video} />
              </View>
            )}

            <Pressable style={styles.arButton} onPress={handleStartARAvatar}>
              <Text style={styles.arButtonText}>Start</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>Steps to Follow:</Text>
            {therapyDetails.steps.map((step, i) => (
              <Text key={i} style={styles.listItem}>{`\u2022 ${step}`}</Text>
            ))}

            <Text style={styles.sectionTitle}>Benefits:</Text>
            {therapyDetails.benefits.map((benefit, i) => (
              <Text key={i} style={styles.listItem}>{`\u2022 ${benefit}`}</Text>
            ))}
            </ScrollView>
          </>
        ) : (
          <Text style={styles.errorText}>{error || "No therapy details available."}</Text>
        )}
      <BottomNavBar />
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
    marginRight: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  description: {
    textAlign: "center",
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#33E4DB",
    marginBottom: 10,
  },
  listItem: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    marginBottom: 10,
  },
  videoContainer: {
    marginVertical: 15,
  },
  video: {
    height: 200,
  },
  arButton: {
    backgroundColor: "#00BBD3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
    marginBottom: 25
  },
  arButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
});

export default TherapyDetails;
