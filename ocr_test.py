import google.generativeai as genai
import PIL.Image
import json
import requests
import time
import os
from io import BytesIO

# --- CONFIGURATION ---
# Set your key here or import it from config
API_KEY = os.environ.get("GENAI_API_KEY")
genai.configure(api_key=API_KEY)

# Initialize models globally to avoid re-initializing on every request
primary_model = genai.GenerativeModel("gemini-2.5-flash", generation_config={"response_mime_type": "application/json"})
backup_model = genai.GenerativeModel("gemini-2.5-flash-lite", generation_config={"response_mime_type": "application/json"})

def load_image_from_url(url):
    """Downloads image from URL and converts to PIL Image."""
    try:
        print(f"📥 Downloading: {url}")
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        # Convert bytes to PIL Image immediately
        return PIL.Image.open(BytesIO(response.content))
    except Exception as e:
        print(f"❌ Error loading image: {e}")
        return None

def parse_json_response(raw_text):
    """Cleans AI output to ensure valid JSON."""
    try:
        clean_text = raw_text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except json.JSONDecodeError:
        return []

def extract_medicines(image_url):
    """
    Takes a URL, runs AI extraction, and returns a Python List of medicines.
    """
    img = load_image_from_url(image_url)
    
    if not img:
        return []

    # Prompt tuned to match your add_medicine.js fields
    prompt = """
    You are an expert pharmacist. Analyze this prescription.
    Extract medicines into a JSON list.
    
    Strictly follow these value constraints to match the database:
    1. 'times': Use ONLY ["Morning", "Afternoon", "Evening", "Night"].
    2. 'food': Use ONLY "Before Food", "After Food", or "No preference".
    3. 'medium': Use ONLY "Tablet", "Capsule", "Syrup", "Drops", "Injection".
    
    JSON Output Structure:
    [
      {
        "name": "Medicine Name", 
        "dosage": "e.g. 500mg", 
        "medium": "Tablet", 
        "quantity": 10,
        "quantity_per_dose": 1, 
        "food": "After Food", 
        "times": ["Morning", "Night"], 
        "duration_days": 5,
        "notes": "Any special instructions"
      }
    ]
    """

    # 1. Try Primary Model
    try:
        print("🚀 Sending to Gemini 2.5 Flash...")
        response = primary_model.generate_content([prompt, img])
        return parse_json_response(response.text)
    except Exception as e:
        print(f"⚠️ Primary failed ({e}). Switching to Backup...")
        
        # 2. Try Backup Model (Hail Mary)
        try:
            time.sleep(1)
            response = backup_model.generate_content([prompt, img])
            return parse_json_response(response.text)
        except Exception as e2:
            print(f"❌ All models failed: {e2}")
            return []
