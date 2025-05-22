import os
import pickle
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
import numpy as np
import pandas as pd
import logging
from firebase_admin import credentials, initialize_app, db
import firebase_admin
from google.cloud import translate_v2 as translate
from google.cloud import speech_v1p1beta1 as speech
from pydub import AudioSegment
import datetime

# Setup logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize Firebase
try:
    cred = credentials.Certificate('../credentials/firebase_serviceAccountKey.json')
    initialize_app(cred, {'databaseURL': 'https://ceyloncare-bdefa-default-rtdb.firebaseio.com/'})
    logger.debug('[DEBUG] Firebase app initialized successfully')
except Exception as e:
    logger.error(f'[ERROR] Failed to initialize Firebase app: {e}')
    raise

# Initialize Google Translate
try:
    translate_client = translate.Client()
    logger.debug('[DEBUG] Google Translate client initialized successfully')
except Exception as e:
    logger.error(f'[ERROR] Failed to initialize Google Translate client: {e}')
    raise

# Load model and assets
try:
    model = load_model('best_chatbot_model.keras', compile=False)
    with open('tokenizer.pkl', 'rb') as f:
        tokenizer = pickle.load(f)
    with open('label_encoder.pkl', 'rb') as f:
        label_encoder = pickle.load(f)
    data_df = pd.read_csv('dataset_chatbot_updated.csv')
    data_df['Age'] = pd.to_numeric(data_df['Age'], errors='coerce')
    MAX_SEQ_LENGTH = 50
    logger.debug('[DEBUG] Model and assets loaded successfully')
except Exception as e:
    logger.error(f'[ERROR] Failed to load model or assets: {e}')
    raise

def is_sinhala_text(text):
    sinhala_pattern = re.compile(r'[\u0D80-\u0DFF]')
    return bool(sinhala_pattern.search(text))

def get_user_profile(user_id):
    try:
        ref = db.reference('users').child(user_id)
        snapshot = ref.get()
        return snapshot or {'age': None, 'gender': None, 'healthCondition': 'general'}
    except Exception as e:
        logger.error(f'[ERROR] Failed to fetch user profile: {e}')
        return {'age': None, 'gender': None, 'healthCondition': 'general'}

def save_chat_history(user_id, query, response, language_code, recommendation=''):
    try:
        ref = db.reference('chats').push({
            'userId': user_id,
            'query': query,
            'response': response,
            'recommendation': recommendation,
            'language': language_code,
            'timestamp': firebase_admin.db.ServerValue.TIMESTAMP
        })
        logger.debug(f'[DEBUG] Chat saved successfully, key: {ref.key}')
    except Exception as e:
        logger.warning(f'[WARNING] ServerValue failed: {e}, using client-side timestamp')
        ref = db.reference('chats').push({
            'userId': user_id,
            'query': query,
            'response': response,
            'recommendation': recommendation,
            'language': language_code,
            'timestamp': datetime.datetime.now().isoformat()
        })
        logger.debug(f'[DEBUG] Chat saved with client-side timestamp, key: {ref.key}')

def convert_audio_to_required_format(input_path, output_path):
    try:
        audio = AudioSegment.from_file(input_path)
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        audio.export(output_path, format='wav')
        logger.debug(f'[DEBUG] Converted audio to 16kHz, mono, 16-bit WAV: {output_path}')
    except Exception as e:
        logger.error(f'[ERROR] Failed to convert audio: {e}')
        raise

def get_audio_duration(audio_path):
    try:
        audio = AudioSegment.from_file(audio_path)
        duration = len(audio) / 1000.0
        logger.debug(f'[DEBUG] Audio duration: {duration} seconds')
        return duration
    except Exception as e:
        logger.error(f'[ERROR] Failed to get audio duration: {e}')
        return 0

def validate_audio_file(audio_path):
    try:
        audio = AudioSegment.from_file(audio_path)
        channels = audio.channels
        frame_rate = audio.frame_rate
        sample_width = audio.sample_width * 8
        logger.debug(f'[DEBUG] Audio validation - Channels: {channels}, Frame Rate: {frame_rate} Hz, Sample Width: {sample_width} bits')
        if channels != 1 or frame_rate != 16000 or sample_width != 16:
            logger.error('[ERROR] Audio format mismatch - Expected: 1 channel, 16000 Hz, 16-bit')
            return False
        return True
    except Exception as e:
        logger.error(f'[ERROR] Failed to validate audio file: {e}')
        return False

def transcribe_audio(audio_path, language_code):
    try:
        if not os.path.exists(audio_path):
            logger.error('[ERROR] Audio file not found')
            return "Audio file not found."

        converted_audio_path = audio_path.replace('.wav', '_converted.wav')
        convert_audio_to_required_format(audio_path, converted_audio_path)

        if not validate_audio_file(converted_audio_path):
            return "Invalid audio format. Please ensure the recording is in 16kHz, mono, 16-bit WAV."

        duration = get_audio_duration(converted_audio_path)
        if duration < 2:
            logger.warning(f'[WARNING] Audio duration too short: {duration} seconds')
            return "Audio too short. Please record at least 2 seconds."

        logger.debug(f'[DEBUG] Transcribing audio: {converted_audio_path}, language: {language_code}')
        client = speech.SpeechClient()
        with open(converted_audio_path, 'rb') as audio_file:
            content = audio_file.read()
        audio = speech.RecognitionAudio(content=content)

        speech_contexts = []
        if language_code == 'si-LK':
            speech_contexts = [
                speech.SpeechContext(phrases=[
                    "ආයුබෝවන්", "මම", "මට", "උණ", "දියවැඩියාව", "සුවය", "වෛද්‍ය", "ප්‍රශ්නය", 
                    "සහාය", "ආහාර", "සෞඛ්‍යය", "උපදෙස්", "පාලනය", "රුධිර", "පීඩනය", 
                    "එක", "දෙක", "තුන", "හතර", "පහ", "හය", "හත", "අට", "නවය", "දහය", 
                    "කරුණාකර", "මට උදව් කරන්න", "මම හොඳින් නැහැ", "මට බෙහෙත් ඕනේ", 
                    "මගේ රෝගය", "උණුසුම", "සෙම්ප්‍රතිශ්‍යාව", "ඔබට ස්තුතියි"
                ])
            ]
            logger.debug('[DEBUG] Sinhala speech contexts loaded')
        else:
            speech_contexts = [
                speech.SpeechContext(phrases=["hello", "i", "need", "health", "advice", "advise", "help", "doctor"])
            ]
            logger.debug('[DEBUG] English speech contexts loaded')

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=language_code,
            enable_automatic_punctuation=True,
            speech_contexts=speech_contexts,
            enable_word_time_offsets=True,
        )

        operation = client.long_running_recognize(config=config, audio=audio)
        response = operation.result(timeout=90)
        if not response.results:
            logger.warning('[WARNING] No transcription results returned')
            return "Could not understand the audio. Please speak clearly, reduce background noise, or try again."

        transcript = response.results[0].alternatives[0].transcript
        confidence = response.results[0].alternatives[0].confidence
        logger.debug(f'[DEBUG] Transcription successful: {transcript}, Confidence: {confidence}')
        return transcript
    except Exception as e:
        logger.error(f'[ERROR] Transcription error: {e}')
        return "Error transcribing audio. Please speak clearly, reduce background noise, or try again."
    finally:
        if os.path.exists(converted_audio_path):
            os.remove(converted_audio_path)
            logger.debug(f'[DEBUG] Cleaned up converted audio file: {converted_audio_path}')

def chatbot_predict(query, language_code, user_id, age=None, gender=None, health_condition=None):
    logger.debug(f'[DEBUG] chatbot_predict inputs - query: "{query}", language_code: "{language_code}", user_id: "{user_id}", age: {age}, gender: "{gender}", health_condition: "{health_condition}"')

    profile = get_user_profile(user_id)
    age = age or profile['age']
    gender = gender or profile['gender']
    health_condition = health_condition or profile['healthCondition'].lower()

    try:
        age = float(age) if age is not None else None
    except (ValueError, TypeError):
        logger.warning(f'[WARNING] Invalid age value: {age}, setting to None')
        age = None

    target_language = 'Sinhala' if language_code == 'si-LK' or is_sinhala_text(query) else 'English'
    seq = tokenizer.texts_to_sequences([query])
    padded_seq = pad_sequences(seq, maxlen=MAX_SEQ_LENGTH)
    prediction = np.argmax(model.predict(padded_seq), axis=1)
    intent = label_encoder.inverse_transform(prediction)[0]
    logger.debug(f'[DEBUG] Predicted intent: {intent}, target_language: {target_language}')

    filtered_df = data_df[(data_df['Intent'] == intent) & (data_df['Language'] == target_language)]
    if age and not pd.isna(age):
        filtered_df = filtered_df[pd.to_numeric(filtered_df['Age'], errors='coerce').abs().sub(age).abs() <= 10]
    if gender:
        filtered_df = filtered_df[filtered_df['Gender'] == gender]
    if health_condition and health_condition != 'general':
        specific_df = filtered_df[filtered_df['Health Condition'] == health_condition]
        filtered_df = specific_df if not specific_df.empty else filtered_df

    if filtered_df.empty:
        result = {
            'response': "මම ඔබේ ප්‍රශ්නයට උපදෙස් සොයා ගත නොහැකි විය." if target_language == 'Sinhala' else "I couldn't find advice for your query.",
            'recommendation': ''
        }
        logger.debug(f'[DEBUG] No matching responses found: {result}')
        return result

    response = filtered_df['Response'].iloc[0]
    recommendation = filtered_df['Recommendation (Condition)'].iloc[0]

    if target_language == 'Sinhala':
        try:
            translation = translate_client.translate(recommendation, target_language='si')
            recommendation = translation['translatedText']
        except Exception as e:
            logger.error(f'[ERROR] Translation failed: {e}')
            recommendation = f"{recommendation} (Translation failed)"

    result = {'response': response, 'recommendation': recommendation}
    logger.debug(f'[DEBUG] Selected response: {result}')
    return result

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message')
    user_id = data.get('userId')
    language_code = data.get('languageCode', 'en-US')
    age = data.get('age')
    gender = data.get('gender')
    health_condition = data.get('healthCondition', 'general')

    if not message or not user_id:
        return jsonify({'error': 'Missing message or userId'}), 400

    result = chatbot_predict(message, language_code, user_id, age, gender, health_condition)
    save_chat_history(user_id, message, result['response'], language_code, result['recommendation'])
    return jsonify(result)

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        logger.debug('[DEBUG] Received /transcribe request')
        if 'audio' not in request.files:
            logger.error('[ERROR] No audio file in request')
            return jsonify({'error': 'No audio file'}), 400

        audio_file = request.files['audio']
        user_id = request.form.get('userId')
        language_code = request.form.get('languageCode', 'en-US')
        age = request.form.get('age')
        gender = request.form.get('gender')
        health_condition = request.form.get('healthCondition', 'general')

        if not user_id:
            logger.error('[ERROR] Missing userId in request')
            return jsonify({'error': 'Missing userId'}), 400

        audio_path = os.path.join('Uploads', audio_file.filename)
        os.makedirs('Uploads', exist_ok=True)
        logger.debug(f'[DEBUG] Saving audio to: {audio_path}')
        audio_file.save(audio_path)

        debug_path = os.path.join('Uploads', f'debug_{audio_file.filename}')
        audio_file.seek(0)
        with open(debug_path, 'wb') as f:
            f.write(audio_file.read())
        logger.debug(f'[DEBUG] Saved debug audio to: {debug_path}')

        transcript = transcribe_audio(audio_path, language_code)
        logger.debug(f'[DEBUG] Transcription result: {transcript}')

        try:
            os.remove(audio_path)
            logger.debug(f'[DEBUG] Cleaned up audio file: {audio_path}')
            if os.path.exists(debug_path):
                os.remove(debug_path)
                logger.debug(f'[DEBUG] Cleaned up debug file: {debug_path}')
        except Exception as e:
            logger.warning(f'[WARNING] Failed to clean up audio file: {e}')

        if isinstance(transcript, str) and (not transcript or transcript.startswith("Error") or transcript.startswith("Could not") or transcript.startswith("Audio")):
            logger.error('[ERROR] Transcription failed or returned empty result')
            return jsonify({'error': transcript}), 500

        result = chatbot_predict(transcript, language_code, user_id, age, gender, health_condition)
        logger.debug(f'[DEBUG] Chat result for transcript: {result}')

        save_chat_history(user_id, transcript, result['response'], language_code, result['recommendation'])
        return jsonify({
            'transcript': transcript,
            'response': result['response'],
            'recommendation': result['recommendation']
        })
    except Exception as e:
        logger.error(f'[ERROR] /transcribe endpoint failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    logger.debug('[DEBUG] Starting Flask server on port 5003')
    app.run(host='0.0.0.0', port=5003, debug=True)