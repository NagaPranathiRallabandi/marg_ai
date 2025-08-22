import torch

is_available = torch.cuda.is_available()
print(f"Is GPU available? {is_available}")

if is_available:
    print(f"Device count: {torch.cuda.device_count()}")
    print(f"Device name: {torch.cuda.get_device_name(0)}")