from flask import Flask, request, jsonify
import cv2
import mediapipe as mp
import base64
import numpy as np
import logging
import traceback

# Set up logging for debugging and error tracking
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
mp_pose = mp.solutions.pose

# Initialize MediaPipe Pose model with adjusted confidence thresholds
pose = mp_pose.Pose(min_detection_confidence=0.6, min_tracking_confidence=0.7)

@app.route('/process_frame', methods=['POST'])
def process_frame():
    try:
        # Log incoming request
        logger.info('[DEBUG] Received request to process frame')
        
        # Get JSON data from request
        data = request.json
        if not data or 'frame' not in data:
            logger.error('[ERROR] Invalid request: Missing frame data')
            return jsonify({'error': 'Missing frame data'}), 400

        # Extract and log frame data
        frame_base64 = data['frame']
        logger.debug('[DEBUG] Frame base64 length: %d', len(frame_base64))

        # Decode base64 string to image
        frame = base64.b64decode(frame_base64)
        image = cv2.imdecode(np.frombuffer(frame, np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            logger.error('[ERROR] Failed to decode image')
            return jsonify({'error': 'Failed to decode image'}), 400

        # Log image details
        logger.debug('[DEBUG] Image decoded, shape: %s', image.shape)

        # Preprocess image to enhance contrast and brightness
        image = cv2.convertScaleAbs(image, alpha=1.2, beta=20)  # Increase contrast and brightness
        logger.debug('[DEBUG] Image preprocessed with contrast alpha=1.2 and brightness beta=20')

        # Convert image to RGB for MediaPipe processing
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)

        # Process pose detection results
        if results.pose_landmarks:
            landmarks = [
                {
                    'name': f'landmark_{i}',
                    'x': 1 - lm.x,  # Mirror x-coordinate to match front-facing camera
                    'y': lm.y,
                    'z': lm.z
                }
                for i, lm in enumerate(results.pose_landmarks.landmark)
            ]
            logger.info('[DEBUG] Pose landmarks detected: %d', len(landmarks))
            
            # Log specific landmarks to verify coordinates after mirroring
            for lm in landmarks:
                if lm['name'] in ['landmark_11', 'landmark_12']:  # left_shoulder, right_shoulder
                    logger.debug('[DEBUG] Mirrored %s: x=%.3f, y=%.3f, z=%.3f', lm['name'], lm['x'], lm['y'], lm['z'])
            
            return jsonify({'landmarks': landmarks})
        else:
            logger.warning('[WARN] No pose landmarks detected')
            return jsonify({'landmarks': []})

    except Exception as e:
        # Log detailed error information
        logger.error('[ERROR] Error processing frame: %s', str(e))
        logger.error('[ERROR] Traceback: %s', traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info('[INFO] Starting pose detection service on http://0.0.0.0:5002')
    app.run(host='0.0.0.0', port=5002, debug=True)