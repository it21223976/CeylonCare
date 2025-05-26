import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const sriLankanFoods = [
  'Boiled Red Kawpi (Cowpea)',
  'Mung Bean Curry',
  'Boiled Purple Yam',
  'Boiled Manioc',
  'Papaya Curry',
  'Thebu-Kola-Sambol',
  'Aguna Kola Mallum',
  'Ambra-Juice',
  'Nelli',
  'Kohila',
  'Starfruit Salad',
  'Karawila Curry',
  'Brown Rice',
  'Gotu Kola Sambol',
  'Murunga Leaves Mallum (Drumstick Leaves Stir-Fry)',
  'Bovitiya Tea',
  'Polpala Tea',
  'Ranawara Tea',
  'Iramusu Tea',
  'Nilkatarolu Juice',
  'Garlic and Tomato Soup',
  'Fenugreek Drink',
  'Pumpkin Curry',
  'Del (Breadfruit) Curry',
  'Squashed Eggplant Curry',
  'Eggplant Curry',
  'Karapincha Soup',
  'Tomato Curry',
  'Ash Banana (Alu Kesel) Curry',
  'Belimal Tea',
  'Cabbage Curry',
  'Chick Peas',
  'Eggplant and Tomato Stir Fry',
  'Gotu Kola Herbal Tea',
  'Halmasso Fish Curry (Sri Lankan Sprats Curry)',
  'Kathurumurunga Mallum (Sesbania Grandiflora Leaf Mallum)',
  'Kesel Muwa Curry (Banana Flower Curry)',
  'Kola Kanda',
  'Kurakkan Bread',
  'Kurakkan Kanda',
  'Kurakkan Pittu',
  'Kurakkan Roti',
  'Lime & Ginger Tea',
  'Lunu Kanda',
  'Mugunuwanna Mallum',
  'Roasted Chickpeas',
  'Thampala',
  'Turmeric Tea (Golden Milk)',
  'White Kawpi'
];
const ManualFoodInput = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoods, setSelectedFoods] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  
  const API_BASE = 'http://192.168.1.9:5000';

  // Filter foods based on search query
  const filteredFoods = sriLankanFoods.filter(food => 
    food.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Toggle food selection
  const toggleFoodSelection = (food) => {
    if (selectedFoods.includes(food)) {
      setSelectedFoods(selectedFoods.filter(f => f !== food));
    } else {
      setSelectedFoods([...selectedFoods, food]);
    }
  };
  
  // Analyze selected foods
  const analyzeSelectedFoods = async () => {
    if (selectedFoods.length === 0) {
      alert('Please select at least one food item');
      return;
    }

    // Clear out any previous analysis immediately
    setAnalysisResult(null);

    try {
      const userProfile = { medical_conditions: ['Diabetes'], foods: selectedFoods };
      const resp = await fetch(`${API_BASE}/analysis-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, limit: selectedFoods.length })
      });
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || 'Analysis failed');

      setAnalysisResult({
        healthScore: Math.round(json.analysis_score),
        nutritionalAnalysis: 'The selected combination provides a good balance of carbohydrates and proteins, but may be high in saturated fats.',
        healthImpact: `This meal combination is ${json.analysis_score > 75 ? 'very' : json.analysis_score > 50 ? 'moderately' : 'somewhat'} healthy for your condition.`,
        suggestions: [
          'Consider reducing the portion size of rice to manage blood sugar levels',
          'Add more vegetables to increase the fiber content',
          'Choose lean protein sources to reduce saturated fat intake'
        ],
        alternatives: [
          { original: 'Rice and Curry', alternative: 'Kurakkan (Finger Millet) Roti with Curry' },
          { original: 'Hoppers (Appa)', alternative: 'Kurakkan Pittu' }
        ]
      });
    } catch (err) {
      console.error(err);
      alert('Failed to fetch analysis score. Please try again.');
    }
  };

  
  // Render food item
  const renderFoodItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.foodItem,
        selectedFoods.includes(item) && styles.selectedFoodItem
      ]}
      onPress={() => toggleFoodSelection(item)}
    >
      <Text 
        style={[
          styles.foodItemText,
          selectedFoods.includes(item) && styles.selectedFoodItemText
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Food Input</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>
            Select the Sri Lankan foods you'd like to analyze
          </Text>
          
          <TextInput
            style={styles.searchInput}
            placeholder="Search for foods..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedText}>
              Selected: {selectedFoods.length} items
            </Text>
            {selectedFoods.length > 0 && (
              <TouchableOpacity 
                style={styles.analyzeButton}
                onPress={analyzeSelectedFoods}
              >
                <Text style={styles.analyzeButtonText}>Analyze</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Food List Container with fixed height when analysis is shown */}
          <View style={[
            styles.foodListContainer,
            analysisResult && styles.foodListContainerCompact
          ]}>
            <FlatList
              data={filteredFoods}
              renderItem={renderFoodItem}
              keyExtractor={(item) => item}
              style={styles.foodList}
              scrollEnabled={!analysisResult} // Disable FlatList scroll when analysis is shown
              nestedScrollEnabled={false}
            />
          </View>
          
          {analysisResult && (
            <View style={styles.analysisResultContainer}>
              <View style={styles.resultHeader}>
                <Text style={styles.analysisTitle}>Analysis Results</Text>
                <View style={styles.healthScoreContainer}>
                  <Text style={styles.healthScoreLabel}>Health Score</Text>
                  <Text style={styles.healthScoreValue}>{analysisResult.healthScore}/100</Text>
                </View>
              </View>
              
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Nutritional Analysis</Text>
                <Text style={styles.analysisText}>{analysisResult.nutritionalAnalysis}</Text>
              </View>
              
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Health Impact</Text>
                <Text style={styles.analysisText}>{analysisResult.healthImpact}</Text>
              </View>
              
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Suggestions</Text>
                {analysisResult.suggestions.map((suggestion, index) => (
                  <View key={index} style={styles.suggestionItem}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Healthier Alternatives</Text>
                {analysisResult.alternatives.map((item, index) => (
                  <View key={index} style={styles.alternativeItem}>
                    <Text style={styles.originalFood}>{item.original}</Text>
                    <Text style={styles.arrowIcon}>→</Text>
                    <Text style={styles.alternativeFood}>{item.alternative}</Text>
                  </View>
                ))}
              </View>
              
              {/* Clear Analysis Button */}
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => {
                  setAnalysisResult(null);
                  setSelectedFoods([]);
                }}

              >
                <Text style={styles.clearButtonText}>Clear Analysis</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#00CEC9',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40, // Extra padding at bottom for better scroll experience
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  selectedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedText: {
    fontSize: 16,
    color: '#555555',
  },
  analyzeButton: {
    backgroundColor: '#00CEC9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  analyzeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  foodListContainer: {
    minHeight: 400, // Minimum height for food list
    marginBottom: 16,
  },
  foodListContainerCompact: {
    maxHeight: 200, // Compact height when analysis is shown
  },
  foodList: {
    flex: 1,
  },
  foodItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedFoodItem: {
    backgroundColor: '#E8FFF6',
  },
  foodItemText: {
    fontSize: 16,
    color: '#555555',
  },
  selectedFoodItemText: {
    color: '#00CEC9',
    fontWeight: '600',
  },
  analysisResultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  healthScoreContainer: {
    backgroundColor: '#E8FFF6',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  healthScoreLabel: {
    fontSize: 12,
    color: '#00CEC9',
  },
  healthScoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00CEC9',
  },
  analysisSection: {
    marginBottom: 16,
  },
  analysisSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  },
  suggestionItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#00CEC9',
    marginRight: 8,
    width: 10,
  },
  suggestionText: {
    fontSize: 14,
    color: '#555555',
    flex: 1,
    lineHeight: 20,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalFood: {
    fontSize: 14,
    color: '#555555',
    flex: 1,
  },
  arrowIcon: {
    fontSize: 16,
    color: '#00CEC9',
    marginHorizontal: 8,
  },
  alternativeFood: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00CEC9',
    flex: 1,
  },
  addToPlanButton: {
    backgroundColor: '#00CEC9',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  addToPlanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  clearButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
});

export default ManualFoodInput;