import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ScreenOrientation from 'expo-screen-orientation';
import axios from 'axios';
import { Canvas as R3FCanvas, useFrame } from '@react-three/fiber/native';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Mesh, Box3, Vector3 } from 'three';
import * as THREE from 'three';
import { Ionicons } from '@expo/vector-icons';
import Canvas, { CanvasRenderingContext2D } from 'react-native-canvas';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const Avatar: React.FC<{ isAnimating: boolean; url: string | null }> = ({ isAnimating, url }) => {
  const dummyTextureLoader = {
    load: (url: string, onLoad: (texture: THREE.Texture) => void) => {
      const texture = new THREE.Texture();
      texture.needsUpdate = true;
      onLoad(texture);
    },
    setCrossOrigin: () => {},
  };

  const gltf = useGLTF(url || '', true, true, (loader: any) => {
    loader.textureLoader = dummyTextureLoader;
    loader.loadTexture = () => new THREE.Texture();
  });

  const meshRef = useRef<Mesh>(null!);
  const { actions, mixer } = useAnimations(gltf.animations, gltf.scene);
  const [avatarScale, setAvatarScale] = useState(2);
  const [avatarPosition, setAvatarPosition] = useState([0, -1.5, -2]);

  useEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshBasicMaterial({ 
            color: 0xaaaaaa, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 0.9 
          });
          child.material.needsUpdate = true;
        }
      });
    }
  }, [gltf]);

  useEffect(() => {
    console.log('[DEBUG] GLTF model loaded with URL:', url, 'GLTF object:', gltf);
    if (!gltf.scene) {
      console.error('[ERROR] GLTF scene is null or undefined for URL:', url);
    }
  }, [gltf, url]);

  useEffect(() => {
    if (isAnimating && mixer && actions && gltf.scene) {
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
  }, [isAnimating, actions, mixer, gltf.scene]);

  useFrame(() => {});

  return gltf.scene ? (
    <primitive ref={meshRef} object={gltf.scene} position={avatarPosition} scale={avatarScale} />
  ) : (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="lightgray" />
    </mesh>
  );
};

const ARAvatarScreen: React.FC<{
  route: { params?: { arPoseUrl?: string; therapyName?: string } };
  navigation: { goBack: () => void };
}> = ({ route, navigation }) => {
  const { arPoseUrl = 'https://res.cloudinary.com/dmwaockgw/image/upload/v1741590782/warrior_II_lp2hfq.glb', 
          therapyName = 'Warrior II' } = route.params || {};

  const [feedback, setFeedback] = useState<string>('Please stand 2-3 meters back and calibrate.');
  const [shortFeedback, setShortFeedback] = useState<string>('Calibrate to start');
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [targetLandmarks, setTargetLandmarks] = useState<any[]>([]);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [matchPercentage, setMatchPercentage] = useState(0);
  const [userLandmarks, setUserLandmarks] = useState<any[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const canvasRef = useRef<Canvas>(null);

  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes("THREE.GLTFLoader: Couldn't load texture")) {
        originalError('[SUPPRESSED FROM UI] THREE.GLTFLoader: Couldn’t load texture', ...args.slice(1));
      } else {
        originalError(...args);
      }
    };
    return () => {
      console.error = originalError;
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
      if (intervalRef.current) {
        console.log('[DEBUG] Clearing frame capture interval');
        clearInterval(intervalRef.current);
        console.log('[DEBUG] Frame capture interval cleared');
      }
      ScreenOrientation.unlockAsync().catch((error) => 
        console.error('[ERROR] Failed to unlock orientation:', error.message));
    };
  }, []);

  useEffect(() => {
    const fetchTargetLandmarks = async () => {
      try {
        console.log('[DEBUG] Fetching target landmarks for therapy:', therapyName);
        const response = await axios.get(`http://192.168.60.107:5000/therapy_landmarks/${encodeURIComponent(therapyName)}`);
        console.log('[DEBUG] Target landmarks response:', JSON.stringify(response.data, null, 2));
        setTargetLandmarks(response.data.landmarks || []);
      } catch (error) {
        console.error('[ERROR] Failed to fetch target landmarks:', (error as any)?.message || String(error));
        setFeedback('Error loading target pose data. Please check your connection.');
        setShortFeedback('Network error');
      }
    };
    fetchTargetLandmarks();
  }, [therapyName]);

  useEffect(() => {
    if (isCameraReady && cameraRef.current && permission?.granted && targetLandmarks.length > 0 && isCalibrated) {
      console.log('[DEBUG] Starting frame capture interval');
      intervalRef.current = setInterval(captureFrame, 500);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isCameraReady, permission, targetLandmarks, isCalibrated]);

  const calibrateCamera = async () => {
    if (!cameraRef.current || !permission?.granted) {
      console.error('[ERROR] Cannot calibrate: Camera not ready or permission denied');
      setFeedback('Camera not ready for calibration.');
      setShortFeedback('Camera error');
      return;
    }

    try {
      console.log('[DEBUG] Starting camera calibration');
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.1 });
      const response = await axios.post('http://192.168.60.107:5000/process_frame', 
        { frame: photo.base64 }, 
        { timeout: 10000 }
      );

      if (response.data.landmarks && response.data.landmarks.length > 0) {
        const calibrationOffset = computeCalibrationOffset(response.data.landmarks);
        console.log('[DEBUG] Calibration offset:', JSON.stringify(calibrationOffset));
        setIsCalibrated(true);
        setFeedback('Calibration successful. Please start posing.');
        setShortFeedback('Calibrated!');
        captureFrame(); // Trigger initial frame capture after calibration
      } else {
        console.warn('[WARN] No landmarks detected during calibration');
        setFeedback('Calibration failed. Ensure you are visible.');
        setShortFeedback('No landmarks');
      }
    } catch (error) {
      console.error('[ERROR] Calibration error:', (error as any)?.message);
      setFeedback('Calibration error. Please try again.');
      setShortFeedback('Calibration failed');
    }
  };

  const computeCalibrationOffset = (userLandmarks: any[]) => {
    return {
      x: userLandmarks.reduce((sum, lm) => sum + lm.x, 0) / userLandmarks.length,
      y: userLandmarks.reduce((sum, lm) => sum + lm.y, 0) / userLandmarks.length,
      z: userLandmarks.reduce((sum, lm) => sum + lm.z, 0) / userLandmarks.length,
    };
  };

  const landmarkNames = {
    0: 'nose',
    11: 'left_shoulder',
    12: 'right_shoulder',
    13: 'left_elbow',
    14: 'right_elbow',
    23: 'left_hip',
    24: 'right_hip',
    25: 'left_knee',
    26: 'right_knee',
  };

  const mapLandmarks = (landmarks: any[]) => {
    return landmarks.map((lm, index) => ({
      name: landmarkNames[index as keyof typeof landmarkNames] || `landmark_${index}`,
      x: lm.x,
      y: lm.y,
      z: lm.z,
    }));
  };

  const comparePoses = (userLandmarks: any[], targetLandmarks: any[]) => {
    const targetMap = new Map(targetLandmarks.map(lm => [lm.name, lm]));
    const relevantUserLandmarks = userLandmarks.filter(lm => targetMap.has(lm.name));

    if (!relevantUserLandmarks.length || !targetLandmarks.length) {
      setShortFeedback('No landmarks');
      return 'No matching landmarks. Ensure you are in the correct pose.';
    }

    const maxDistance = 0.1;
    let feedback = '';
    let shortFeedback = '';
    let matches = 0;

    relevantUserLandmarks.forEach(userLm => {
      const targetLm = targetMap.get(userLm.name);
      const dx = Math.abs(userLm.x - targetLm.x);
      const dy = Math.abs(userLm.y - targetLm.y);
      const dz = Math.abs(userLm.z - targetLm.z);
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < maxDistance) {
        matches++;
      } else if (!shortFeedback) {
        shortFeedback = `Move your ${userLm.name.replace('_', ' ')}`;
        if (dx > dy && dx > dz) {
          shortFeedback += userLm.x > targetLm.x ? ' slightly to the left' : ' slightly to the right';
        } else if (dy > dx && dy > dz) {
          shortFeedback += userLm.y > targetLm.y ? ' down a bit' : ' up a bit';
        } else {
          shortFeedback += userLm.z > targetLm.z ? ' backward a bit' : ' forward a bit';
        }
        feedback += shortFeedback + '\n';
      }
    });

    const matchPercentage = (matches / relevantUserLandmarks.length) * 100;
    feedback += `Match: ${matchPercentage.toFixed(1)}%`;

    if (matchPercentage > 70 && !shortFeedback) {
      shortFeedback = 'Great pose!';
    } else if (matchPercentage > 50 && !shortFeedback) {
      shortFeedback = 'Almost there!';
    } else if (!shortFeedback) {
      shortFeedback = 'Keep adjusting!';
    }

    setShortFeedback(shortFeedback);
    return feedback || 'No pose detected.';
  };

  const captureFrame = async () => {
    if (!cameraRef.current || !permission?.granted || !isCalibrated) {
      console.error('[ERROR] Cannot capture frame');
      setFeedback('Please calibrate first.');
      setShortFeedback('Calibrate first');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.1 });
      const response = await axios.post('http://192.168.60.107:5000/process_frame', 
        { frame: photo.base64 }, 
        { timeout: 10000 }
      );

      if (response.data.landmarks && response.data.landmarks.length > 0) {
        const mappedLandmarks = mapLandmarks(response.data.landmarks);
        setUserLandmarks(mappedLandmarks);
        const comparisonFeedback = comparePoses(mappedLandmarks, targetLandmarks);
        const match = parseFloat(comparisonFeedback.match(/Match: (\d+\.\d+)%/)?.[1] || '0');
        setMatchPercentage(match);
        setFeedback(comparisonFeedback);
      } else {
        console.warn('[WARN] No landmarks detected');
        setFeedback('No pose detected.');
        setShortFeedback('No pose');
      }
    } catch (error) {
      console.error('[ERROR] Frame capture error:', (error as any)?.message);
      setFeedback('Error capturing frame.');
      setShortFeedback('Capture error');
    }
  };

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[], targetLandmarks: any[]) => {
    if (!ctx) {
      console.error('[ERROR] Canvas context is null');
      return;
    }

    const targetMap = new Map(targetLandmarks.map(lm => [lm.name, lm]));
    console.log('[DEBUG] Drawing landmarks:', landmarks);

    // Clear canvas
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Draw joints
    landmarks.forEach(lm => {
      const targetLm = targetMap.get(lm.name);
      if (targetLm) {
        const dx = Math.abs(lm.x - targetLm.x);
        const dy = Math.abs(lm.y - targetLm.y);
        const dz = Math.abs(lm.z - targetLm.z);
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const color = distance < 0.1 ? 'green' : 'red';

        // Map normalized coordinates to screen coordinates
        const x = lm.x * SCREEN_WIDTH;
        const y = (1 - lm.y) * SCREEN_HEIGHT; // Invert y-axis for correct orientation

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      }
    });

    // Draw pose lines (only after calibration)
    if (isCalibrated) {
      const connections = [
        ['left_shoulder', 'right_shoulder'],
        ['left_hip', 'right_hip'],
        ['left_shoulder', 'left_elbow'],
        ['right_shoulder', 'right_elbow'],
        ['left_hip', 'left_knee'],
        ['right_hip', 'right_knee'],
      ];

      connections.forEach(([start, end]) => {
        const startLm = landmarks.find(lm => lm.name === start);
        const endLm = landmarks.find(lm => lm.name === end);
        if (startLm && endLm) {
          const startX = startLm.x * SCREEN_WIDTH;
          const startY = (1 - startLm.y) * SCREEN_HEIGHT;
          const endX = endLm.x * SCREEN_WIDTH;
          const endY = (1 - endLm.y) * SCREEN_HEIGHT;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();
          console.log('[DEBUG] Drawing line from', start, 'to', end, 'at', { startX, startY, endX, endY });
        }
      });
    }
  };

  useEffect(() => {
    if (canvasRef.current && userLandmarks.length > 0) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        console.log('[DEBUG] Canvas context initialized, drawing landmarks');
        drawLandmarks(ctx, userLandmarks, targetLandmarks);
      } else {
        console.error('[ERROR] Failed to get 2D context');
      }
    }
  }, [userLandmarks, targetLandmarks, isCalibrated]);

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
      <CameraView 
        ref={cameraRef} 
        style={styles.camera} 
        facing="front" 
        onCameraReady={() => setIsCameraReady(true)} 
      />
      <Canvas ref={canvasRef} style={styles.canvasOverlay} />
      <View style={styles.avatarWindow}>
        <R3FCanvas style={styles.canvas} camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 1, 1]} intensity={0.5} />
          <Avatar isAnimating={isAnimating} url={modelUri} />
        </R3FCanvas>
      </View>
      <View style={styles.feedbackOverlay}>
        <Text style={styles.matchText}>{matchPercentage.toFixed(1)}%</Text>
        <Text style={styles.feedback}>{shortFeedback}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { 
            width: `${matchPercentage}%`, 
            backgroundColor: matchPercentage > 70 ? '#34D399' : '#F87171' 
          }]} />
        </View>
      </View>
      {!isCalibrated && (
        <TouchableOpacity style={styles.calibrateButton} onPress={calibrateCamera}>
          <Text style={styles.buttonText}>Calibrate</Text>
        </TouchableOpacity>
      )}
      <View style={styles.buttonBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setIsAnimating((prev) => !prev)} 
          style={[styles.startButton, isAnimating ? styles.startButtonActive : null]}
        >
          <Ionicons name={isAnimating ? "pause" : "play"} size={24} color="white" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

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
  canvasOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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
  matchText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  feedback: {
    color: '#ddd',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  progressBar: {
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    fontSize: 18,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#60A5FA',
    borderRadius: 10,
    alignSelf: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  startButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  startButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  calibrateButton: {
    position: 'absolute',
    bottom: 100,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#60A5FA',
    borderRadius: 15,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonBar: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    zIndex: 2,
  },
});

export default ARAvatarScreen;