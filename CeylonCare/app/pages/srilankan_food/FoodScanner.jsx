import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import BottomNavBar from '../../BottomNavBar';

const FoodScanner = ({ navigation }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Request camera permissions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera permissions to take photos!',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Capture image from camera
  const captureImage = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const base64Image = result.assets[0].base64;
        
        setCapturedImage({ uri: imageUri, base64: base64Image });
        setAnalysisResult(null);
        setShowResults(false);
        
        Alert.alert(
          'Image Captured!',
          'Would you like to analyze this food?',
          [
            { text: 'Retake', onPress: () => setCapturedImage(null) },
            { text: 'Analyze', onPress: analyzeImage }
          ]
        );
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const base64Image = result.assets[0].base64;
        
        setCapturedImage({ uri: imageUri, base64: base64Image });
        setAnalysisResult(null);
        setShowResults(false);
        
        Alert.alert(
          'Image Selected!',
          'Would you like to analyze this food?',
          [
            { text: 'Pick Another', onPress: () => setCapturedImage(null) },
            { text: 'Analyze', onPress: analyzeImage }
          ]
        );
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };
  
  // Function to analyze the captured image
  const analyzeImage = async () => {
    if (!capturedImage || !capturedImage.base64) {
      Alert.alert('Error', 'No image available for analysis');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Replace with your actual backend URL
      const response = await fetch('http://172.20.10.14:5000/analyze-food-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: capturedImage.base64,
          foodHint: '' // Optional hint about the food
        }),
      });

      const result = await response.json();

      if (result.success && result.analysis) {
        setAnalysisResult(result.analysis);
        setShowResults(true);
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert(
        'Analysis Error', 
        'Failed to analyze the food image. Please check your internet connection and try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Reset to take new photo
  const resetScanner = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setShowResults(false);
    setIsAnalyzing(false);
  };
  
  // Get health recommendation color based on score
  const getHealthScoreColor = (score) => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };
  
  // Get health recommendation text based on score
  const getHealthRecommendation = (score) => {
    if (score >= 80) return 'Excellent choice for your health!';
    if (score >= 60) return 'Good choice with some considerations';
    return 'Consider healthier alternatives';
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food Scanner</Text>
      </View>
      
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {!capturedImage ? (
          // Camera/Capture view
          <View style={styles.cameraContainer}>
            <View style={styles.cameraPlaceholder}>
              <LinearGradient
                colors={['#33E4DB', '#00BBD3']}
                style={styles.cameraIcon}
              >
                <Text style={styles.cameraIconText}>📷</Text>
              </LinearGradient>
              
              <Text style={styles.cameraText}>Take a photo of your Sri Lankan food</Text>
              <Text style={styles.cameraSubtext}>
                Get instant analysis of nutritional content and personalized health recommendations
              </Text>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={captureImage}
                >
                  <LinearGradient
                    colors={['#33E4DB', '#00BBD3']}
                    style={styles.captureGradient}
                  >
                    <Text style={styles.captureButtonText}>📸 Take Photo</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.galleryButton}
                  onPress={pickImage}
                >
                  <Text style={styles.galleryButtonText}>📁 Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>What you'll get:</Text>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🔍</Text>
                  <Text style={styles.featureText}>AI food identification</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>📊</Text>
                  <Text style={styles.featureText}>Detailed nutritional analysis</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>❤️</Text>
                  <Text style={styles.featureText}>Personalized health score</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>💡</Text>
                  <Text style={styles.featureText}>Health improvement suggestions</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          // Image analysis view
          <View style={styles.analysisContainer}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: capturedImage.uri }} style={styles.capturedImage} />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={resetScanner}
              >
                <Text style={styles.retakeButtonText}>🔄 Retake</Text>
              </TouchableOpacity>
            </View>
            
            {isAnalyzing && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color="#00BBD3" />
                <Text style={styles.analyzingText}>Analyzing your food...</Text>
                <Text style={styles.analyzingSubtext}>
                  Using AI to identify ingredients and nutritional content
                </Text>
              </View>
            )}
            
            {!isAnalyzing && !showResults && (
              <View style={styles.analyzeButtonContainer}>
                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={analyzeImage}
                >
                  <LinearGradient
                    colors={['#33E4DB', '#00BBD3']}
                    style={styles.analyzeGradient}
                  >
                    <Text style={styles.analyzeButtonText}>🔍 Analyze This Food</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
            
            {showResults && analysisResult && (
              <View style={styles.resultsContainer}>
                {/* Identified Food */}
                <View style={styles.resultSection}>
                  <Text style={styles.identifiedFood}>{analysisResult.identifiedFood}</Text>
                  <Text style={styles.confidenceText}>
                    Confidence: {Math.round(analysisResult.confidence * 100)}%
                  </Text>
                  
                  {/* Top Predictions */}
                  {analysisResult.topPredictions && (
                    <View style={styles.topPredictionsContainer}>
                      <Text style={styles.topPredictionsTitle}>Other possibilities:</Text>
                      {analysisResult.topPredictions.slice(1, 3).map((pred, index) => (
                        <Text key={index} style={styles.topPredictionItem}>
                          • {pred.food} ({Math.round(pred.confidence * 100)}%)
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
                
                {/* Health Score */}
                <View style={styles.healthScoreSection}>
                  <Text style={styles.sectionTitle}>Health Score</Text>
                  <View style={styles.scoreContainer}>
                    <View 
                      style={[
                        styles.scoreCircle, 
                        { borderColor: getHealthScoreColor(analysisResult.healthScore) }
                      ]}
                    >
                      <Text 
                        style={[
                          styles.scoreValue, 
                          { color: getHealthScoreColor(analysisResult.healthScore) }
                        ]}
                      >
                        {analysisResult.healthScore}
                      </Text>
                      <Text style={styles.scoreOutOf}>/100</Text>
                    </View>
                    <View style={styles.scoreInfo}>
                      <Text style={styles.scoreRecommendation}>
                        {getHealthRecommendation(analysisResult.healthScore)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Nutritional Information */}
                <View style={styles.resultSection}>
                  <Text style={styles.sectionTitle}>Nutritional Information</Text>
                  <View style={styles.nutritionGrid}>
                    {Object.entries(analysisResult.nutritionalValue).map(([key, value], index) => (
                      <View key={index} style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{value}</Text>
                        <Text style={styles.nutritionLabel}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                
                {/* Health Benefits */}
                <View style={styles.resultSection}>
                  <Text style={styles.sectionTitle}>Health Benefits</Text>
                  {analysisResult.healthBenefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitItem}>
                      <Text style={styles.benefitIcon}>✅</Text>
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
                
                {/* Suggestions */}
                {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                  <View style={styles.resultSection}>
                    <Text style={styles.sectionTitle}>Health Suggestions</Text>
                    {analysisResult.suggestions.map((suggestion, index) => (
                      <View key={index} style={styles.suggestionItem}>
                        <Text style={styles.suggestionIcon}>💡</Text>
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.secondaryActionButton}
                    onPress={() => navigation.navigate('FoodRecommendations')}
                  >
                    <Text style={styles.secondaryActionText}>More Foods</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.primaryActionButton}
                    onPress={resetScanner}
                  >
                    <LinearGradient
                      colors={['#33E4DB', '#00BBD3']}
                      style={styles.primaryActionGradient}
                    >
                      <Text style={styles.primaryActionText}>Scan Another</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Bottom spacing for navigation */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      <BottomNavBar navigation={navigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    backgroundColor: '#00BBD3',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    fontFamily: 'League Spartan',
    marginRight: 30,
  },
  backButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 30,
    color: 'white',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraPlaceholder: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  cameraIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraIconText: {
    fontSize: 40,
  },
  cameraText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'League Spartan',
  },
  cameraSubtext: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: 'League Spartan',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  captureButton: {
    marginBottom: 12,
  },
  captureGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  captureButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'League Spartan',
  },
  galleryButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  galleryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555555',
    fontFamily: 'League Spartan',
  },
  featuresContainer: {
    width: '100%',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    fontFamily: 'League Spartan',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  featureText: {
    fontSize: 14,
    color: '#555555',
    fontFamily: 'League Spartan',
  },
  analysisContainer: {
    padding: 20,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  capturedImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  retakeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  retakeButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'League Spartan',
  },
  analyzingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  analyzingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
    fontFamily: 'League Spartan',
  },
  analyzingSubtext: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'League Spartan',
  },
  analyzeButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  analyzeButton: {
    width: '100%',
  },
  analyzeGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyzeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'League Spartan',
  },
  resultsContainer: {
    marginTop: 10,
  },
  resultSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  identifiedFood: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
    fontFamily: 'League Spartan',
  },
  confidenceText: {
    fontSize: 14,
    color: '#00BBD3',
    fontWeight: '600',
    fontFamily: 'League Spartan',
    marginBottom: 12,
  },
  topPredictionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  topPredictionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    fontFamily: 'League Spartan',
  },
  topPredictionItem: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 4,
    fontFamily: 'League Spartan',
  },
  healthScoreSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
    fontFamily: 'League Spartan',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'League Spartan',
  },
  scoreOutOf: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'League Spartan',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreRecommendation: {
    fontSize: 16,
    color: '#555555',
    fontFamily: 'League Spartan',
    lineHeight: 22,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    width: '30%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00BBD3',
    marginBottom: 4,
    fontFamily: 'League Spartan',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#555555',
    textAlign: 'center',
    fontFamily: 'League Spartan',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  benefitText: {
    fontSize: 16,
    color: '#555555',
    flex: 1,
    lineHeight: 22,
    fontFamily: 'League Spartan',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  suggestionIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  suggestionText: {
    fontSize: 16,
    color: '#555555',
    flex: 1,
    lineHeight: 22,
    fontFamily: 'League Spartan',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 12,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    fontFamily: 'League Spartan',
  },
  primaryActionButton: {
    flex: 1,
  },
  primaryActionGradient: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'League Spartan',
  },
  bottomSpacing: {
    height: 100, // Space for bottom navigation
  },
});

export default FoodScanner;