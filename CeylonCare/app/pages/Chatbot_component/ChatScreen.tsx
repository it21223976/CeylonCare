import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert, Platform, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const ChatScreen = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ id: string; user: string; bot: string }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [languageCode, setLanguageCode] = useState('en-US');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [ttsInitialized, setTtsInitialized] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<{ age?: number; gender?: string; healthCondition?: string } | null>(null);
  const flatListRef = useRef<FlatList>(null); // Reference to FlatList for scrolling

  const isSinhalaText = (text: string): boolean => {
    const sinhalaPattern = /[\u0D80-\u0DFF]/;
    const result = sinhalaPattern.test(text);
    console.log(`[DEBUG] isSinhalaText: text="${text}", result=${result}`);
    return result;
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await Speech.getAvailableVoicesAsync();
        setTtsInitialized(true);
        const storedUserId = await AsyncStorage.getItem('userId');
        setUserId(storedUserId || 'defaultUserId');
        const profile = { age: 45, gender: 'Female', healthCondition: 'diabetes' };
        setUserProfile(profile);
        console.log('[DEBUG] Initialized with userId:', storedUserId, 'Profile:', profile);
      } catch (error) {
        console.error('[ERROR] Initialization failed:', error);
        Alert.alert('Error', `Failed to initialize app: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    initialize();

    return () => {
      if (recording) recording.stopAndUnloadAsync().catch(console.error);
      if (ttsInitialized) Speech.stop().catch(console.error);
    };
  }, []);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) throw new Error('Microphone permission denied');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 2,
        interruptionModeAndroid: 2,
      });
      console.log('[DEBUG] Audio mode set successfully');

      const newRecording = new Audio.Recording();
      const recordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_WAV,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 16,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 16,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
      console.log('[DEBUG] Recording options:', JSON.stringify(recordingOptions));
      await newRecording.prepareToRecordAsync(recordingOptions);
      await newRecording.startAsync();
      setRecording(newRecording);
      setRecordingStartTime(Date.now());
      setIsRecording(true);
      console.log('[DEBUG] Recording started with languageCode:', languageCode);
    } catch (error) {
      console.error('[ERROR] Failed to start recording:', error);
      Alert.alert('Error', `Failed to start recording: ${error instanceof Error ? error.message : String(error)}`);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording || !recordingStartTime) {
      setIsRecording(false);
      return;
    }
    try {
      const duration = (Date.now() - recordingStartTime) / 1000;
      if (duration < 2) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
        setIsRecording(false);
        setRecordingStartTime(null);
        throw new Error('Recording too short. Please record at least 2 seconds.');
      }
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('No URI for recording');
      setRecording(null);
      setIsRecording(false);
      setRecordingStartTime(null);
      console.log('[DEBUG] Recording stopped, duration:', duration, 'seconds');
      await sendMessage('', true, uri);
    } catch (error) {
      console.error('[ERROR] Failed to stop recording:', error);
      Alert.alert('Error', `Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`);
      setIsRecording(false);
      setRecordingStartTime(null);
    }
  };

  const speakResponse = async (text: string, language: string) => {
    if (!ttsInitialized) return;
    try {
      console.log('[DEBUG] Speaking response:', text, 'in language:', language);
      await Speech.speak(text, {
        language: language === 'si-LK' ? 'si' : 'en',
        pitch: 1.0,
        rate: 0.5,
      });
    } catch (error) {
      console.error('[ERROR] TTS failed:', error);
    }
  };

  const sendMessage = async (textMessage = message, isVoice = false, audioUri?: string) => {
    if (!textMessage && !isVoice) return;
    if (!userId || !userProfile) return Alert.alert('Error', 'User not identified or profile unavailable');

    textMessage = textMessage.trim().toLowerCase();

    let detectedLanguageCode = languageCode;
    if (!isVoice) {
      detectedLanguageCode = isSinhalaText(textMessage) ? 'si-LK' : 'en-US';
      console.log('[DEBUG] Detected language code for text input:', detectedLanguageCode, 'for message:', textMessage);
    } else {
      console.log('[DEBUG] Using languageCode for voice input:', detectedLanguageCode);
    }

    if (detectedLanguageCode !== languageCode) {
      console.log('[DEBUG] Updating languageCode from', languageCode, 'to', detectedLanguageCode);
      setLanguageCode(detectedLanguageCode);
    }

    const messageId = Date.now().toString();
    const newChatHistory = [...chatHistory, { id: messageId, user: isVoice ? 'Voice Input' : textMessage, bot: '...' }];
    setChatHistory(newChatHistory);

    // Scroll to the bottom after adding a new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      let response;
      if (isVoice && audioUri) {
        const formData = new FormData();
        formData.append('audio', {
          uri: audioUri,
          type: 'audio/wav',
          name: 'voice.wav',
        } as any);
        formData.append('languageCode', detectedLanguageCode);
        formData.append('userId', userId);
        formData.append('age', userProfile.age?.toString() || '');
        formData.append('gender', userProfile.gender || '');
        formData.append('healthCondition', userProfile.healthCondition || '');
        console.log('[DEBUG] Sending voice request with languageCode:', detectedLanguageCode);
        response = await axios.post('http://192.168.8.134:5003/transcribe', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 15000,
        });
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        textMessage = response.data.transcript ? response.data.transcript.trim().toLowerCase() : 'Voice input';
        console.log('[DEBUG] Normalized transcribed text:', textMessage);
      } else {
        console.log('[DEBUG] Sending text request with message:', textMessage, 'languageCode:', detectedLanguageCode);
        response = await axios.post('http://192.168.8.134:5003/chat', {
          message: textMessage,
          userId,
          languageCode: detectedLanguageCode,
          age: userProfile.age,
          gender: userProfile.gender,
          healthCondition: userProfile.healthCondition,
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        });
      }

      const botResponse = response.data.response;
      const recommendation = response.data.recommendation || '';
      console.log('[DEBUG] Received response:', botResponse, 'Recommendation:', recommendation);
      await speakResponse(botResponse + (recommendation ? ` Recommendation: ${recommendation}` : ''), detectedLanguageCode);
      setChatHistory(prev =>
        prev.map(item =>
          item.id === messageId
            ? { ...item, user: textMessage, bot: `${botResponse}${recommendation ? `\nRecommendation: ${recommendation}` : ''}` }
            : item
        )
      );

      // Scroll to the bottom after updating the bot response
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('[ERROR] Request failed:', error);
      let errorMessage = error instanceof Error ? error.message : String(error);
      if ('response' in (error as any)) {
        console.error('[ERROR] Server response:', JSON.stringify((error as any).response.data, null, 2));
        errorMessage = (error as any).response.data.error || errorMessage;
      }
      Alert.alert(
        'Error',
        errorMessage === 'Could not understand the audio. Please speak clearly, reduce background noise, or try again.'
          ? 'Could not understand your voice. Please speak slowly and clearly, reduce background noise, or try again.'
          : `Failed to connect to chatbot: ${errorMessage}`
      );
      setChatHistory(prev =>
        prev.map(item => (item.id === messageId ? { ...item, bot: 'Error occurred' } : item))
      );

      // Scroll to the bottom after error
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    setMessage('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={chatHistory}
        renderItem={({ item }) => (
          <View style={styles.messageContainer}>
            <View style={styles.userMessageContainer}>
              <Text style={styles.userMessage}>You: {item.user}</Text>
            </View>
            <View style={styles.botMessageContainer}>
              <Text style={styles.botMessage}>Bot: {item.bot}</Text>
            </View>
          </View>
        )}
        keyExtractor={item => item.id}
        style={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={text => {
            setMessage(text);
            const newLanguageCode = isSinhalaText(text) ? 'si-LK' : 'en-US';
            if (newLanguageCode !== languageCode) {
              console.log('[DEBUG] Text input language changed to:', newLanguageCode);
              setLanguageCode(newLanguageCode);
            }
          }}
          placeholder="Type your message..."
          placeholderTextColor="#888"
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => sendMessage()} disabled={!userId || !message}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.recordButton} onPress={isRecording ? stopRecording : startRecording}>
          <Text style={styles.buttonText}>{isRecording ? 'Stop Recording' : 'Start Recording'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setLanguageCode(prev => {
            const newLang = prev === 'en-US' ? 'si-LK' : 'en-US';
            console.log('[DEBUG] Manually switched language to:', newLang);
            return newLang;
          })}
        >
          <Text style={styles.buttonText}>Switch to {languageCode === 'en-US' ? 'Sinhala' : 'English'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 10,
  },
  chatList: {
    flex: 1,
    paddingBottom: 10,
  },
  messageContainer: {
    marginVertical: 5,
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    marginBottom: 5,
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
  },
  userMessage: {
    fontWeight: '500',
    color: '#007AFF',
    padding: 12,
    backgroundColor: '#E5F0FF',
    borderRadius: 20,
    maxWidth: '80%',
  },
  botMessage: {
    color: '#333',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    maxWidth: '80%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FFF',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginLeft: 10,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recordButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 1,
    marginRight: 5,
  },
  languageButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 1,
    marginLeft: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ChatScreen;