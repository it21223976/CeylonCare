import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Mesh, Box3, Vector3 } from 'three';
import * as THREE from 'three';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, Circle } from 'react-native-svg';
import allTherapyData from '../../../assets/ar_poses/all_therapy_data.json';
import axios from 'axios';

// Avatar Component
const Avatar: React.FC<{ isAnimating: boolean; url: string | null }> = ({ isAnimating, url }) => {
  const gltf = useGLTF(url || '', true); // Enable fallback
  const meshRef = useRef<Mesh>(null!);
  const { actions, mixer } = useAnimations(gltf.animations, gltf.scene);
  const [avatarScale, setAvatarScale] = useState(2);
  const [avatarPosition, setAvatarPosition] = useState([0, -1.5, -2]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (gltf.scene) {
      console.log('[DEBUG] GLTF scene loaded:', gltf.scene);
    } else {
      console.error('[ERROR] GLTF scene is null or undefined for URL:', url);
      setLoadError(true);
    }
  }, [gltf, url]);

  useEffect(() => {
    if (isAnimating && mixer && actions && gltf.scene && !loadError) {
      const action = actions['WarriorII'] || actions[Object.keys(actions)[0]];
      if (action) {
        console.log('[DEBUG] Starting animation');
        action.reset().play();

        const boundingBox = new Box3().setFromObject(gltf.scene);
        const size = new Vector3();
        boundingBox.getSize(size);
        const center = new Vector3();
        boundingBox.getCenter(center);

        const windowWidth = 250;
        const windowHeight = 300;
        const modelWidth = Math.max(size.x, 0.1);
        const modelHeight = Math.max(size.y, 0.1);
        const scaleX = (windowWidth * 0.9) / modelWidth;
        const scaleY = (windowHeight * 0.9) / modelHeight;
        const newScale = Math.max(Math.min(scaleX, scaleY, 1), 2);

        const newPosition = [
          -center.x * newScale,
          -center.y * newScale - 1,
          -2,
        ];

        console.log('[DEBUG] Auto-adjusted scale:', newScale, 'position:', newPosition);
        setAvatarScale(newScale);
        setAvatarPosition(newPosition);
      } else {
        console.warn('[WARN] No valid animation action found');
      }
    } else if (!isAnimating && mixer) {
      console.log('[DEBUG] Stopping animation');
      mixer.stopAllAction();
      setAvatarScale(2);
      setAvatarPosition([0, -1.5, -2]);
    }
  }, [isAnimating, actions, mixer, gltf.scene, loadError]);

  useFrame(() => {});

  return !loadError && gltf.scene ? (
    <primitive ref={meshRef} object={gltf.scene} position={avatarPosition} scale={avatarScale} />
  ) : (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ff0000" />
    </mesh>
  );
};

// Default Angle Definitions (Fallback)
const defaultAngleDefinitions = [
  { joint1: 'left_shoulder', joint2: 'left_elbow', joint3: 'left_wrist', name: 'left elbow angle' },
  { joint1: 'right_shoulder', joint2: 'right_elbow', joint3: 'right_wrist', name: 'right elbow angle' },
  { joint1: 'left_hip', joint2: 'left_knee', joint3: 'left_ankle', name: 'left knee angle' },
  { joint1: 'right_hip', joint2: 'right_knee', joint3: 'right_ankle', name: 'right knee angle' },
];

// Pose-Specific Angle Definitions
const poseAngleDefinitions = {
  'Downward_Dog': [
    { joint1: 'left_shoulder', joint2: 'left_hip', joint3: 'left_knee', name: 'left hip angle' },
    { joint1: 'right_shoulder', joint2: 'right_hip', joint3: 'right_knee', name: 'right hip angle' },
    { joint1: 'left_hip', joint2: 'left_knee', joint3: 'left_ankle', name: 'left knee angle' },
    { joint1: 'right_hip', joint2: 'right_knee', joint3: 'right_ankle', name: 'right knee angle' },
  ],
  'Triangle_Pose': [
    { joint1: 'left_shoulder', joint2: 'left_hip', joint3: 'left_knee', name: 'left side angle' },
    { joint1: 'right_shoulder', joint2: 'right_hip', joint3: 'right_knee', name: 'right side angle' },
    { joint1: 'left_hip', joint2: 'left_knee', joint3: 'left_ankle', name: 'left knee angle' },
    { joint1: 'right_hip', joint2: 'right_knee', joint3: 'right_ankle', name: 'right knee angle' },
  ],
  'Warrior_II': [
    { joint1: 'left_shoulder', joint2: 'left_elbow', joint3: 'left_wrist', name: 'left arm angle' },
    { joint1: 'right_shoulder', joint2: 'right_elbow', joint3: 'right_wrist', name: 'right arm angle' },
    { joint1: 'left_hip', joint2: 'left_knee', joint3: 'left_ankle', name: 'left knee angle' },
    { joint1: 'right_hip', joint2: 'right_knee', joint3: 'right_ankle', name: 'right knee angle' },
  ],
};

// Main Component
const ARAvatarScreen: React.FC<{
  route: { params?: { arPoseUrl?: string; therapyName?: string } };
  navigation: { goBack: () => void };
}> = ({ route, navigation }) => {
  const { arPoseUrl = 'https://res.cloudinary.com/dmwaockgw/image/upload/v1741786736/Downward_Dog_jp5ixq.glb', therapyName = 'Downward Dog' } = route.params || {};

  const [feedback, setFeedback] = useState<string>('Please stand 2-3 meters back and calibrate.');
  const [shortFeedback, setShortFeedback] = useState<string>('Calibrate to start');
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [targetLandmarks, setTargetLandmarks] = useState<any[]>([]);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [matchPercentage, setMatchPercentage] = useState(0);
  const [userLandmarks, setUserLandmarks] = useState<any[]>([]);
  const [jointStatus, setJointStatus] = useState<{ name: string, isCorrect: boolean }[]>([]);
  const [frameBuffer, setFrameBuffer] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);
  const { width, height } = useWindowDimensions();
  const processFrameQueue = useRef<Promise<void> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current; // For popup animation

  const connections = [
    ['nose', 'left_shoulder'],
    ['nose', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'],
    ['right_shoulder', 'right_elbow'],
    ['left_elbow', 'left_wrist'],
    ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_hip', 'left_knee'],
    ['right_hip', 'right_knee'],
    ['left_knee', 'left_ankle'],
    ['right_knee', 'right_ankle'],
    ['left_hip', 'right_hip'],
  ];

  // Compute therapyKey and select angle definitions
  const therapyKey = therapyName.replace(" ", "_") as keyof typeof poseAngleDefinitions;
  const angleDefs = poseAngleDefinitions[therapyKey] || defaultAngleDefinitions;

  // Ensure camera preview doesn't pause when popup is shown
  useEffect(() => {
    if (cameraRef.current && isCameraReady && permission?.granted) {
      if (showPopup) {
        console.log('[DEBUG] Popup shown, ensuring camera preview remains active');
        cameraRef.current.resumePreview();
      }
    }
  }, [showPopup, isCameraReady, permission]);

  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes("THREE.GLTFLoader: Couldn't load texture")) {
        originalError('[SUPPRESSED FROM UI] THREE.GLTFLoader: Couldn’t load texture', ...args.slice(1));
      } else {
        originalError(...args);
      }
    };
    console.warn = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes("EXGL: gl.pixelStorei() doesn't support this parameter yet")) {
        originalWarn('[SUPPRESSED] EXGL: gl.pixelStorei() warning', ...args.slice(1));
      } else {
        originalWarn(...args);
      }
    };
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    const loadAsset = async () => {
      if (arPoseUrl && arPoseUrl.startsWith('http')) {
        setModelUri(arPoseUrl);
      } else {
        setModelUri(null);
      }
    };
    loadAsset();
  }, [arPoseUrl]);

  useEffect(() => {
    const lockOrientation = async () => {
      try {
        console.log('[DEBUG] Attempting to lock orientation to portrait');
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        console.log('[DEBUG] Orientation locked to portrait');
      } catch (error) {
        console.error('[ERROR] Failed to lock orientation:', (error as Error)?.message || error);
      }
    };
    lockOrientation();

    return () => {
      ScreenOrientation.unlockAsync().catch((error) => console.error('[ERROR] Failed to unlock orientation:', error.message));
    };
  }, []);

  type TherapyKey = keyof typeof allTherapyData;

  useEffect(() => {
    try {
      const therapyKey = therapyName.replace(" ", "_") as TherapyKey;
      console.log('[DEBUG] Accessing therapy data for:', therapyKey);

      const therapyData = allTherapyData[therapyKey];
      if (therapyData && therapyData.landmarks) {
        console.log('[DEBUG] Loaded target landmarks from JSON:', JSON.stringify(therapyData.landmarks, null, 2));
        setTargetLandmarks(therapyData.landmarks);
      } else {
        console.error('[ERROR] No landmarks found for therapy:', therapyName);
        setTargetLandmarks([]);
        setFeedback('Error: Pose data not found in all_therapy_data.json.');
        setShortFeedback('Data missing');
      }
    } catch (error) {
      console.error('[ERROR] Failed to load landmarks from JSON:', (error as any)?.message || String(error));
      setTargetLandmarks([]);
      setFeedback('Error loading pose data. Check all_therapy_data.json.');
      setShortFeedback('Data error');
    }
  }, [therapyName]);

  useEffect(() => {
    if (isCameraReady && cameraRef.current && permission?.granted && targetLandmarks.length > 0 && isCalibrated && !isCalibrating) {
      console.log('[DEBUG] Conditions met, capturing initial frame');
      captureFrame();
    }
  }, [isCameraReady, permission, targetLandmarks, isCalibrated, isCalibrating]);

  const calibrateCamera = async () => {
    if (!cameraRef.current || !permission?.granted) {
      console.error('[ERROR] Cannot calibrate: Camera not ready or permission denied');
      setFeedback('Camera not ready for calibration.');
      setShortFeedback('Camera error');
      return;
    }

    setIsCalibrating(true);
    try {
      console.log('[DEBUG] Starting camera calibration');
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.1 });
      const response = await axios.post('http://172.20.10.14:5000/process_frame', { frame: photo.base64 }, { timeout: 10000 });
      console.log('[DEBUG] Calibration frame response:', JSON.stringify(response.data, null, 2));

      if (response.data.landmarks && response.data.landmarks.length > 0) {
        const calibrationOffset = computeCalibrationOffset(response.data.landmarks);
        console.log('[DEBUG] Calibration offset computed:', JSON.stringify(calibrationOffset, null, 2));
        setIsCalibrated(true);
        setFeedback('Calibration successful! Start posing.');
        setShortFeedback('Calibrated!');
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        console.warn('[WARN] No landmarks detected during calibration');
        setFeedback('Calibration failed. Ensure you are fully visible.');
        setShortFeedback('No landmarks');
      }
    } catch (error) {
      console.error('[ERROR] Calibration error:', (error as any)?.message || String(error));
      setFeedback('Calibration error. Please try again.');
      setShortFeedback('Calibration failed');
    } finally {
      setIsCalibrating(false);
    }
  };

  const computeCalibrationOffset = (userLandmarks: any[]) => {
    const offset = {
      x: userLandmarks.reduce((sum, lm) => sum + lm.x, 0) / userLandmarks.length,
      y: userLandmarks.reduce((sum, lm) => sum + lm.y, 0) / userLandmarks.length,
      z: userLandmarks.reduce((sum, lm) => sum + lm.z, 0) / userLandmarks.length,
    };
    return offset;
  };

  const landmarkNames = {
    0: 'nose',
    11: 'left_shoulder',
    12: 'right_shoulder',
    13: 'left_elbow',
    14: 'right_elbow',
    15: 'left_wrist',
    16: 'right_wrist',
    23: 'left_hip',
    24: 'right_hip',
    25: 'left_knee',
    26: 'right_knee',
    27: 'left_ankle',
    28: 'right_ankle',
  };

  const mapLandmarks = (landmarks: any[]) => {
    return landmarks.map((lm, index) => ({
      name: landmarkNames[index as keyof typeof landmarkNames] || `landmark_${index}`,
      x: lm.x,
      y: lm.y,
      z: lm.z,
    }));
  };

  const calculateAngle = (joint1: any, joint2: any, joint3: any) => {
    const vector1 = { x: joint1.x - joint2.x, y: joint1.y - joint2.y };
    const vector2 = { x: joint3.x - joint2.x, y: joint3.y - joint2.y };

    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
    const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
    const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    const angleRad = Math.acos(dotProduct / (magnitude1 * magnitude2));
    return (angleRad * 180) / Math.PI;
  };

  const comparePoses = (userLandmarks: any[], targetLandmarks: any[]) => {
    const targetMap = new Map(targetLandmarks.map(lm => [lm.name, lm]));
    const userMap = new Map(userLandmarks.map(lm => [lm.name, lm]));
    const relevantUserLandmarks = userLandmarks.filter(lm => targetMap.has(lm.name));

    if (!relevantUserLandmarks.length || !targetLandmarks.length) {
      return { 
        feedback: 'No pose detected. Ensure you are fully visible.', 
        shortFeedback: 'No pose', 
        jointStatus: [], 
        matchPercentage: 0 
      };
    }
    
    let feedback = '';
    let shortFeedback = '';
    let matches = 0;
    const totalComparisons = angleDefs.length;
    const jointStatus: { name: string, isCorrect: boolean }[] = [];
    const tolerance = 10;

    angleDefs.forEach((angleDef: { joint1: string; joint2: string; joint3: string; name: string }) => {
      const { joint1, joint2, joint3, name } = angleDef;
      const userJ1 = userMap.get(joint1);
      const userJ2 = userMap.get(joint2);
      const userJ3 = userMap.get(joint3);
      const targetJ1 = targetMap.get(joint1);
      const targetJ2 = targetMap.get(joint2);
      const targetJ3 = targetMap.get(joint3);

      if (userJ1 && userJ2 && userJ3 && targetJ1 && targetJ2 && targetJ3) {
        const userAngle = calculateAngle(userJ1, userJ2, userJ3);
        const targetAngle = calculateAngle(targetJ1, targetJ2, targetJ3);
        const angleDiff = Math.abs(userAngle - targetAngle);
        const isCorrect = angleDiff <= tolerance;

        if (isCorrect) matches++;

        [joint1, joint2, joint3].forEach(joint => {
          if (!jointStatus.find(js => js.name === joint)) {
            jointStatus.push({ name: joint, isCorrect });
          }
        });

        if (!isCorrect && !shortFeedback) {
          const jointName = name || 'joint';
          shortFeedback = `Adjust your ${jointName.replace('angle', '').trim()}`;
          if (userAngle > targetAngle) {
            shortFeedback += ' to bend less';
          } else {
            shortFeedback += ' to bend more';
          }
        }
      }
    });

    const matchPercentage = (matches / totalComparisons) * 100;
    feedback = `Match: ${Math.round(matchPercentage)}%`;

    if (matchPercentage >= 80 && !shortFeedback) {
      shortFeedback = 'Perfect pose!';
      setShowPopup(true);
    } else if (matchPercentage >= 60 && !shortFeedback) {
      shortFeedback = 'Great job!';
    } else if (!shortFeedback) {
      shortFeedback = 'Keep going!';
    }

    return { feedback, shortFeedback, jointStatus, matchPercentage };
  };

  const captureFrame = async () => {
    if (!cameraRef.current || !permission?.granted || !isCalibrated || isCalibrating) {
      console.error('[ERROR] Cannot capture frame: Camera not ready, permission denied, not calibrated, or calibrating');
      setFeedback('Please calibrate the camera first.');
      setShortFeedback('Calibrate first');
      return;
    }

    try {
      console.log('[DEBUG] Starting frame capture');
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.05 });
      console.log('[DEBUG] Frame captured, base64 length:', photo.base64?.length);
      setFrameBuffer(photo.base64 ?? null);
    } catch (error) {
      console.error('[ERROR] Frame capture error:', (error as any)?.message || String(error));
      setFeedback('Error capturing frame: ' + (error as any)?.message || String(error));
      setShortFeedback('Frame error');
      setUserLandmarks([]);
      setJointStatus([]);
    }
  };

  const processBufferedFrame = async () => {
    if (!frameBuffer || !isCalibrated || isCalibrating) return;

    try {
      console.log('[DEBUG] Processing buffered frame');
      const response = await axios.post('http://172.20.10.14:5000/process_frame', { frame: frameBuffer }, { timeout: 10000 });
      console.log('[DEBUG] Frame processing response:', JSON.stringify(response.data, null, 2));

      if (response.data.landmarks && response.data.landmarks.length > 0) {
        const mappedLandmarks = mapLandmarks(response.data.landmarks);
        console.log('[DEBUG] Raw mapped landmarks:', JSON.stringify(mappedLandmarks, null, 2));
        const { feedback, shortFeedback, jointStatus, matchPercentage } = comparePoses(mappedLandmarks, targetLandmarks);
        setUserLandmarks(mappedLandmarks);
        setFeedback(feedback);
        setShortFeedback(shortFeedback);
        setJointStatus(jointStatus);
        setMatchPercentage(matchPercentage);
      } else {
        console.warn('[WARN] No landmarks detected in frame');
        setFeedback('No pose detected. Ensure you are fully visible.');
        setShortFeedback('No pose');
        setUserLandmarks([]);
        setJointStatus([]);
        setMatchPercentage(0);
      }
    } catch (error) {
      console.error('[ERROR] Frame processing error:', (error as any)?.message || String(error));
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          setFeedback('Network timeout. Please check your connection.');
          setShortFeedback('Network timeout');
        } else if (!error.response) {
          setFeedback('Network error. Please check your connection.');
          setShortFeedback('Network error');
        } else {
          setFeedback('Error processing frame: ' + (error as any).message);
          setShortFeedback('Frame error');
        }
      } else {
        setFeedback('Error processing frame: ' + (error as any)?.message || String(error));
        setShortFeedback('Frame error');
      }
      setUserLandmarks([]);
      setJointStatus([]);
      setMatchPercentage(0);
    } finally {
      setFrameBuffer(null);
      if (!isCalibrating) {
        setTimeout(() => {
          if (isCameraReady && cameraRef.current && permission?.granted && targetLandmarks.length > 0 && isCalibrated && !isCalibrating) {
            captureFrame();
          }
        }, 500);
      }
    }
  };

  useEffect(() => {
    if (frameBuffer && !processFrameQueue.current) {
      processFrameQueue.current = processBufferedFrame().finally(() => {
        processFrameQueue.current = null;
      });
    }
  }, [frameBuffer]);

  // Popup animation and auto-dismiss
  useEffect(() => {
    if (showPopup) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setShowPopup(false));
        }, 2000); // Display for 2 seconds
      });
    }
  }, [showPopup]);

  const retryAsync = async (fn: () => Promise<void>, retries: number, delay: number) => {
    try {
      await fn();
    } catch (error) {
      if (retries > 0) {
        console.log('[DEBUG] Retrying after error:', (error as any)?.message || String(error), `Retries left: ${retries}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        await retryAsync(fn, retries - 1, delay * 2);
      } else {
        throw error;
      }
    }
  };

  const baseStrokeWidth = 4;
  const baseCircleRadius = 8;
  const averageZ = userLandmarks.length > 0 
    ? userLandmarks.reduce((sum, lm) => sum + lm.z, 0) / userLandmarks.length 
    : 0;
  const distanceFactor = Math.max(1, 1 + Math.abs(averageZ) * 2);
  const dynamicStrokeWidth = baseStrokeWidth * distanceFactor;
  const dynamicCircleRadius = baseCircleRadius * distanceFactor;

  const mirroredLandmarks = userLandmarks.map(lm => ({
    ...lm,
  }));

  if (!permission?.granted) {
    return (
      <LinearGradient colors={['#1E3A8A', '#3B82F6']} style={styles.container}>

        <Text style={styles.message}>Camera permission required.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1E3A8A', '#3B82F6']} style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" onCameraReady={() => setIsCameraReady(true)} />
      <Svg style={styles.svgOverlay}>
        {mirroredLandmarks.length > 0 && (
          <>
            {connections.map(([start, end], index) => {
              const startLm = mirroredLandmarks.find(lm => lm.name === start);
              const endLm = mirroredLandmarks.find(lm => lm.name === end);
              if (startLm && endLm) {
                const x1 = startLm.x * width;
                const y1 = startLm.y * height;
                const x2 = endLm.x * width;
                const y2 = endLm.y * height;
                return (
                  <Line 
                    key={index} 
                    x1={x1} 
                    y1={y1} 
                    x2={x2} 
                    y2={y2} 
                    stroke="#00FFFF" 
                    strokeWidth={dynamicStrokeWidth} 
                  />
                );
              }
              return null;
            })}
            {mirroredLandmarks.map((lm, index) => {
              const x = lm.x * width;
              const y = lm.y * height;
              const status = jointStatus.find(js => js.name === lm.name);
              const color = status ? (status.isCorrect ? 'green' : 'red') : 'gray';
              return (
                <Circle 
                  key={index} 
                  cx={x} 
                  cy={y} 
                  r={dynamicCircleRadius} 
                  fill={color} 
                />
              );
            })}
          </>
        )}
      </Svg>
      <View style={styles.feedbackOverlay}>
        <View style={[
          styles.matchCircle, 
          { backgroundColor: matchPercentage >= 80 ? '#34D399' : matchPercentage >= 60 ? '#FBBF24' : '#F87171' }
        ]}>
          <Text style={styles.matchText}>{Math.round(matchPercentage)}%</Text>
        </View>
        <Text style={styles.feedback}>{shortFeedback}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${matchPercentage}%`, backgroundColor: matchPercentage >= 80 ? '#34D399' : matchPercentage >= 60 ? '#FBBF24' : '#F87171' }]} />
        </View>
      </View>
      <View style={styles.avatarWindow}>
        <Canvas style={styles.canvas} camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={1.0} />
          <directionalLight position={[0, 1, 1]} intensity={1.5} />
          <Avatar isAnimating={isAnimating} url={modelUri} />
        </Canvas>
      </View>
      {!isCalibrated && (
        <TouchableOpacity style={styles.calibrateButton} onPress={calibrateCamera} disabled={isCalibrating}>
          <Text style={styles.buttonText}>{isCalibrating ? 'Starting...' : 'Start Tracking'}</Text>
        </TouchableOpacity>
      )}
      <View style={styles.buttonBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsAnimating((prev) => !prev)} style={[styles.startButton, isAnimating ? styles.startButtonActive : null]}>
          <Ionicons name={isAnimating ? "pause" : "play"} size={24} color="white" />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="none"
        transparent={true}
        visible={showPopup}
        onRequestClose={() => setShowPopup(false)}
      >
        <View style={styles.popupContainer}>
          <Animated.View style={[styles.popup, { opacity: fadeAnim }]}>
            <LinearGradient colors={['#10B981', '#34D399']} style={styles.popupGradient}>
              <Text style={styles.popupText}>Great Job!</Text>
              <Text style={styles.popupSubText}>You've mastered the {therapyName} pose!</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  avatarWindow: {
    position: 'absolute',
    top: 25,
    right: 20,
    width: 250,
    height: 300,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
  feedbackOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 290,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    padding: 10,
    zIndex: 2,
    alignItems: 'center',
  },
  matchCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  matchText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  feedback: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#60A5FA',
    borderRadius: 15,
    alignSelf: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
  },
  backButton: {
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  startButton: {
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  startButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  calibrateButton: {
    position: 'absolute',
    bottom: 80,
    paddingVertical: 20,
    paddingHorizontal: 50,
    backgroundColor: '#10B981',
    borderRadius: 25,
    zIndex: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
  },
  buttonBar: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    zIndex: 2,
  },
  popupContainer: {
    flex: 1,
    justifyContent: 'flex-end', // Position at bottom
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Lighter background
    paddingBottom: 20, // Space from bottom edge
  },
  popup: {
    width: '90%', // Wide, thin box
    height: 80, // Reduced height for thin appearance
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  popupGradient: {
    width: '100%',
    height: '100%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row', // Horizontal layout for text
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginRight: 10,
  },
  popupSubText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ARAvatarScreen;