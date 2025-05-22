import cv2
import mediapipe as mp
import json
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("[INFO] Initializing MediaPipe Pose...")
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)
mp_drawing = mp.solutions.drawing_utils
logger.info("[INFO] MediaPipe Pose initialized successfully.")

logger.info("[INFO] Loading therapy configuration...")
config_file_path = os.path.join("D:\\Amasha\\SLIIT\\4 YR\\RP (Research Project)\\ass\\App\\CeylonCare\\Backend\\ar_model\\arPoseLandmarks", "therapy_config.json")
if not os.path.exists(config_file_path):
    logger.error(f"[ERROR] Configuration file not found at: {config_file_path}")
    logger.info("[INFO] Please create therapy_config.json in the script directory.")
    exit()

with open(config_file_path, 'r') as f:
    therapies_config = json.load(f)
logger.info(f"[INFO] Loaded therapy configuration from {config_file_path}")

detected_images_dir = os.path.join("D:\\Amasha\\SLIIT\\4 YR\\RP (Research Project)\\ass\\App\\CeylonCare\\Backend\\ar_model\\arPoseLandmarks", "detected_images")
if not os.path.exists(detected_images_dir):
    os.makedirs(detected_images_dir)
    logger.info(f"[INFO] Created directory for detected images: {detected_images_dir}")

all_therapy_data = {}
for therapy_key, config in therapies_config.items():
    logger.info(f"[INFO] Processing therapy: {therapy_key}")
    image_path = os.path.join("D:\\Amasha\\SLIIT\\4 YR\\RP (Research Project)\\ass\\App\\CeylonCare\\Backend\\ar_model\\arPoseLandmarks\\pose_images", f"{therapy_key}.jpg")
    
    output_image_path = os.path.join(detected_images_dir, f"{therapy_key}_detected.jpg")

    if not os.path.exists(image_path):
        logger.error(f"[ERROR] Image file not found at: {image_path}")
        logger.info("[INFO] Ensure the image is in D:\\Amasha\\SLIIT\\4 YR\\RP (Research Project)\\ass\\App\\CeylonCare\\Backend\\ar_model\\arPoseLandmarks\\pose_images")
        continue

    logger.info(f"[INFO] Loading image for {config['name']}...")
    image = cv2.imread(image_path)
    if image is None:
        logger.error(f"[ERROR] Could not load image for {config['name']} at {image_path}. Check file format or path.")
        continue

    logger.info(f"[INFO] Processing image for pose detection for {config['name']}...")
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb_image)

    if not results.pose_landmarks:
        logger.error(f"[ERROR] No pose detected for {config['name']} in {image_path}. Ensure the image shows a clear pose.")
        cv2.imwrite(output_image_path, image)
        logger.debug(f"[DEBUG] Image (without landmarks) saved as {output_image_path}")
        continue

    mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    cv2.imwrite(output_image_path, image)
    logger.info(f"[INFO] Detected image with landmarks saved as {output_image_path}")

    landmarks = results.pose_landmarks.landmark
    correct_pose = [
        {"name": "left_shoulder", "x": landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].x, "y": landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y, "z": landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].z},
        {"name": "right_shoulder", "x": landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].x, "y": landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].y, "z": landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].z},
        {"name": "left_elbow", "x": landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].x, "y": landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].y, "z": landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].z},
        {"name": "right_elbow", "x": landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].x, "y": landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].y, "z": landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].z},
        {"name": "left_wrist", "x": landmarks[mp_pose.PoseLandmark.LEFT_WRIST].x, "y": landmarks[mp_pose.PoseLandmark.LEFT_WRIST].y, "z": landmarks[mp_pose.PoseLandmark.LEFT_WRIST].z},
        {"name": "right_wrist", "x": landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].x, "y": landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].y, "z": landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].z},
        {"name": "left_hip", "x": landmarks[mp_pose.PoseLandmark.LEFT_HIP].x, "y": landmarks[mp_pose.PoseLandmark.LEFT_HIP].y, "z": landmarks[mp_pose.PoseLandmark.LEFT_HIP].z},
        {"name": "right_hip", "x": landmarks[mp_pose.PoseLandmark.RIGHT_HIP].x, "y": landmarks[mp_pose.PoseLandmark.RIGHT_HIP].y, "z": landmarks[mp_pose.PoseLandmark.RIGHT_HIP].z},
        {"name": "left_knee", "x": landmarks[mp_pose.PoseLandmark.LEFT_KNEE].x, "y": landmarks[mp_pose.PoseLandmark.LEFT_KNEE].y, "z": landmarks[mp_pose.PoseLandmark.LEFT_KNEE].z},
        {"name": "right_knee", "x": landmarks[mp_pose.PoseLandmark.RIGHT_KNEE].x, "y": landmarks[mp_pose.PoseLandmark.RIGHT_KNEE].y, "z": landmarks[mp_pose.PoseLandmark.RIGHT_KNEE].z},
        {"name": "left_ankle", "x": landmarks[mp_pose.PoseLandmark.LEFT_ANKLE].x, "y": landmarks[mp_pose.PoseLandmark.LEFT_ANKLE].y, "z": landmarks[mp_pose.PoseLandmark.LEFT_ANKLE].z},
        {"name": "right_ankle", "x": landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE].x, "y": landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE].y, "z": landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE].z},
    ]
    # Mirror x-coordinates to match front-facing camera
    for landmark in correct_pose:
        landmark['x'] = 1 - landmark['x']

    logger.debug(f"[DEBUG] Extracted landmarks for {config['name']}:")
    for landmark in correct_pose:
        logger.debug(f"[DEBUG] {landmark['name']}: x={landmark['x']:.3f}, y={landmark['y']:.3f}, z={landmark['z']:.3f}")

    therapy_data = {
        "name": config["name"],
        "description": config["description"],
        "ar_pose": config["ar_pose"],
        "reference_video": config["reference_video"],
        "steps": config["steps"],
        "benefits": config["benefits"],
        "landmarks": correct_pose
    }
    all_therapy_data[config["name"].replace(" ", "_")] = therapy_data

pose.close()
logger.info("[INFO] Script completed processing therapies.")

output_all_path = "all_therapy_data.json"
with open(output_all_path, 'w') as f:
    json.dump(all_therapy_data, f, indent=2)
logger.info(f"[INFO] All therapy data saved to {output_all_path}")