from ultralytics import YOLO

# Load a pre-trained model to start from
model = YOLO('yolov8n.pt')

# Train the model using your custom dataset
if __name__ == '__main__':
    # This path goes up one level from ai_service and then into your dataset folder
    results = model.train(data='../Emergency-Vehicles-4/data.yaml', epochs=15, imgsz=640)    