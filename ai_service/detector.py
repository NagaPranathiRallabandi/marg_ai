import cv2
import numpy as np
from flask import Flask, request, jsonify
from ultralytics import YOLO

app = Flask(__name__)

# Load your custom-trained model
model = YOLO('runs/detect/train5/weights/best.pt')

# Define the target class
TARGET_CLASSES = ['emergency']

@app.route('/')
def index():
    return "<h1>Python AI Service is running!</h1>"

@app.route('/detect', methods=['POST'])
def detect_vehicle():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']

    # Read the image file into memory
    np_img = np.fromfile(file, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    # Run model prediction
    results = model(img)

    detections = []
    vehicle_detected = False

    # The loop and return statement are now correctly indented
    for result in results:
        for box in result.boxes:
            class_name = model.names[int(box.cls)]
            confidence = float(box.conf) # Get the confidence score

            # --- FINAL ADJUSTMENT FOR ACCURACY ---
            # A precise threshold of 0.88 (88%)
            if class_name in TARGET_CLASSES and confidence > 0.88:
                vehicle_detected = True
                x1, y1, x2, y2 = box.xyxy[0]
                detections.append({
                    'object_type': class_name,
                    'confidence': confidence,
                    'box': [int(x1), int(y1), int(x2), int(y2)]
                })

    return jsonify({
        'vehicle_detected': vehicle_detected,
        'detections': detections
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
