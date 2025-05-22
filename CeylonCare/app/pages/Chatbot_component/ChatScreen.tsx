import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

const ChatScreen = () => {
  console.log('[DEBUG] ChatScreen component rendering');
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ user: string; bot: string }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [languageCode, setLanguageCode] = useState('en-US');
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [fileSystemReady, setFileSystemReady] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    console.log('[DEBUG] ChatScreen useEffect triggered');
    const initializeFileSystem = async () => {
      try {
        console.log('[DEBUG] Initializing expo-file-system');
        const cacheDir = FileSystem.cacheDirectory;
        console.log('[DEBUG] FileSystem.cacheDirectory:', cacheDir);
        if (!cacheDir) {
          throw new Error('FileSystem.cacheDirectory is null or undefined');
        }

        const dirInfo = await FileSystem.getInfoAsync(cacheDir);
        console.log('[DEBUG] Cache directory info:', JSON.stringify(dirInfo, null, 2));
        if (!dirInfo.exists) {
          console.log('[DEBUG] Cache directory does not exist, creating it');
          await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
          console.log('[DEBUG] Cache directory created');
        } else {
          console.log('[DEBUG] Cache directory already exists');
        }

        setFileSystemReady(true);
        console.log('[DEBUG] expo-file-system initialized successfully');
      } catch (error) {
        console.error('[ERROR] Failed to initialize expo-file-system:', error.message);
        setFileSystemReady(false);
        Alert.alert('File System Error', 'Unable to initialize file system. Voice recording may not work.');
      }
    };

    const fetchUserId = async () => {
      try {
        console.log('[DEBUG] Fetching userId from AsyncStorage');
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
          console.log(`[DEBUG] Fetched userId: ${storedUserId}`);
        } else {
          console.warn('[WARNING] No userId in AsyncStorage, using default');
          setUserId('guQ7Z9OI59fBKqbyT5e8UdFoCc2');
        }
      } catch (error) {
        console.error('[ERROR] Failed to fetch userId:', error.message);
        setUserId('guQ7Z9OI59fBKqbyT5e8UdFoCc2');
      }
    };

    initializeFileSystem();
    fetchUserId();

    return () => {
      console.log('[DEBUG] Cleaning up audio recording');
      if (recording) {
        console.log('[DEBUG] Recording exists, attempting to stop and unload');
        recording.stopAndUnloadAsync().catch(err => {
          console.warn('[WARNING] Failed to clean up recording:', err.message);
        });
      } else {
        console.log('[DEBUG] No active recording to clean up');
      }
      console.log('[DEBUG] Audio recording cleanup completed');
    };
  }, []);

  const startRecording = async () => {
    if (!fileSystemReady) {
      console.error('[ERROR] File system not initialized, cannot start recording');
      Alert.alert('Error', 'File system not initialized. Cannot record audio.');
      return;
    }

    try {
      console.log('[DEBUG] Requesting audio recording permissions');
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Audio recording permissions not granted');
      }
      console.log('[DEBUG] Audio recording permissions granted');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      console.log('[DEBUG] Audio mode set for recording');

      const newRecording = new Audio.Recording();
      console.log('[DEBUG] Created new Audio.Recording instance');

      // Use HIGH_QUALITY preset without specifying a URI
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      console.log('[DEBUG] Recording prepared with default temporary URI');

      await newRecording.startAsync();
      console.log('[DEBUG] Recording started successfully');
      setRecording(newRecording);
      setIsRecording(true);

      const status = await newRecording.getStatusAsync();
      console.log('[DEBUG] Recording status after start:', JSON.stringify(status, null, 2));
    } catch (error) {
      console.error('[ERROR] Failed to start recording:', error.message);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording: ' + error.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      console.warn('[WARNING] No active recording to stop');
      setIsRecording(false);
      return;
    }

    try {
      console.log('[DEBUG] Stopping recording');
      const statusBeforeStop = await recording.getStatusAsync();
      console.log('[DEBUG] Recording status before stop:', JSON.stringify(statusBeforeStop, null, 2));

      await recording.stopAndUnloadAsync();
      console.log('[DEBUG] Recording stopped and unloaded');

      const finalStatus = await recording.getStatusAsync();
      console.log('[DEBUG] Recording status after stop:', JSON.stringify(finalStatus, null, 2));

      // Get the temporary URI from the recording
      const tempUri = recording.getURI(); // Fallback to getURI() if finalStatus.uri is unavailable
      console.log('[DEBUG] Temporary recording URI from getURI():', tempUri);

      if (!tempUri) {
        throw new Error('No temporary URI provided by expo-av after recording');
      }

      // Verify the temporary file exists
      const tempFileInfo = await FileSystem.getInfoAsync(tempUri);
      console.log('[DEBUG] Temporary file info:', JSON.stringify(tempFileInfo, null, 2));
      if (!tempFileInfo.exists) {
        throw new Error('Temporary audio file not found at: ' + tempUri);
      }

      // Define the target path
      const targetPath = `${FileSystem.cacheDirectory}voice.wav`;
      console.log('[DEBUG] Target path for audio file:', targetPath);

      // Move the file from tempUri to targetPath
      console.log(`[DEBUG] Moving file from ${tempUri} to ${targetPath}`);
      await FileSystem.moveAsync({
        from: tempUri,
        to: targetPath,

      });
      console.log('[DEBUG] File moved successfully');

      // Verify the file exists at the target path
      const fileInfo = await FileSystem.getInfoAsync(targetPath);
      console.log('[DEBUG] Target audio file info:', JSON.stringify(fileInfo, null, 2));
      if (!fileInfo.exists) {
        throw new Error('Audio file not found at target path after moving: ' + targetPath);
      }

      console.log('[DEBUG] Audio file size (bytes):', fileInfo.size);
      setAudioPath(targetPath);
      await sendMessage('', true); // Send voice message to backend
    } catch (error) {
      console.error('[ERROR] Failed to stop recording:', error.message);
      Alert.alert('Error', 'Failed to stop recording: ' + error.message);
    } finally {
      setIsRecording(false);
      setRecording(null);
      console.log('[DEBUG] Recording state reset');
    }
  };

  const sendMessage = async (textMessage = message, isVoice = false) => {
    if (!textMessage && !isVoice) {
      console.log('[DEBUG] No message provided');
      return;
    }
    if (!userId) {
      console.log('[DEBUG] No userId provided');
      return;
    }

    setChatHistory([...chatHistory, { user: isVoice ? 'Voice Input' : textMessage, bot: '' }]);
    console.log(`[DEBUG] Sending ${isVoice ? 'voice' : 'text'} message for user ${userId}`);

    try {
      let response;
      if (isVoice && audioPath) {
        console.log('[DEBUG] Preparing FormData for voice input');
        const formData = new FormData();
        formData.append('audio', {
          uri: Platform.OS === 'android' ? `file://${audioPath}` : audioPath,
          type: 'audio/wav',
          name: 'voice.wav',
        });
        formData.append('languageCode', languageCode);
        console.log('[DEBUG] FormData prepared with audio URI:', audioPath);

        console.log('[DEBUG] Sending voice input to backend');
        response = await axios.post(`http://192.168.8.134:5000/healthChat/${userId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log('[DEBUG] Voice response from backend:', JSON.stringify(response.data, null, 2));
        textMessage = response.data.transcript || 'Voice input';
      } else {
        console.log('[DEBUG] Sending text input to backend');
        response = await axios.post(`http://192.168.8.134:5000/healthChat/${userId}`, {
          message: textMessage,
        }, {
          headers: { 'Content-Type': 'application/json' },
        });
        console.log('[DEBUG] Text response from backend:', JSON.stringify(response.data, null, 2));
      }

      const botResponse = response.data.response;
      console.log('[DEBUG] Bot response received:', botResponse);

      setChatHistory(prev => [...prev.slice(0, -1), { user: textMessage, bot: botResponse }]);
      console.log('[DEBUG] Chat history updated with bot response');
    } catch (error) {
      console.error('[ERROR] Chatbot request failed:', error.message);
      if (error.response) {
        console.error('[DEBUG] Error response from backend:', JSON.stringify(error.response.data, null, 2));
      }
      Alert.alert('Error', 'Failed to connect to chatbot');
      setChatHistory(prev => [...prev.slice(0, -1), { user: textMessage, bot: 'Error connecting to chatbot' }]);
    }

    setMessage('');
    setAudioPath(null);
    console.log('[DEBUG] Message input cleared');
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chatHistory}
        renderItem={({ item }) => (
          <View>
            <Text style={styles.userMessage}>You: {item.user}</Text>
            <Text style={styles.botMessage}>Bot: {item.bot}</Text>
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="Type your message..."
        onSubmitEditing={() => sendMessage()}
      />
      <Button title="Send" onPress={() => sendMessage()} disabled={!userId} />
      <Button
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        onPress={isRecording ? stopRecording : startRecording}
      />
      <Button
        title={`Switch to ${languageCode === 'en-US' ? 'Sinhala' : 'English'}`}
        onPress={() => setLanguageCode(prev => prev === 'en-US' ? 'si-LK' : 'en-US')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  input: { borderWidth: 1, padding: 10, marginVertical: 10 },
  userMessage: { fontWeight: 'bold', color: 'blue' },
  botMessage: { color: 'green' },
});

export default ChatScreen;