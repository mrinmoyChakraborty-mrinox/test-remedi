from flask import Flask, request, jsonify, session, render_template, redirect, url_for, flash, Response , send_from_directory
from services import firebase_service, upload
from firebase_admin import auth, messaging
import os
from werkzeug.utils import secure_filename
from datetime import datetime
import pytz
import threading
import json
cron_running = False

# Initialize Flask
app = Flask(__name__)
app.secret_key = "supersecretkey"  # change this before deployment

# Routes
@app.route('/')

def home():
    if 'user' in session:
       
        return render_template("home.html", user=session['user'])

    return render_template("home.html")
@app.route('/about')
def about():
    return render_template("aboutus.html", user=session['user'] if 'user' in session else None)
@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('getstarted'))
    
    return render_template("dashboard.html", user=session['user'])
@app.route('/profile')
def profile():
    if 'user' not in session:
        return redirect(url_for('getstarted'))
    
    email = session['user']['email']
    user_data = firebase_service.get_user(email)
    
    # Update session while we are here to keep it fresh
    if user_data:
        session['user'] = user_data
    return render_template("profilepage_copy.html", user=user_data)    
@app.route('/update_profile', methods=['POST'])
def update_profile():
    if 'user' not in session:
        return redirect('/')

    print("--- UPDATE PROFILE STARTED ---") # Debug 1

    email = session['user']['email']
    
    # 1. Collect Text Data
    updates = {
        "username": request.form.get('username'),
        "age": request.form.get('age'),
        "gender": request.form.get('gender'),
        "emergency_contact": request.form.get('emergency_contact')
    }

    # 2. Check for File
    print(f"Files in request: {request.files}") # Debug 2
    
    if 'profile_pic' in request.files:
        
        profile_pic = request.files.get("profile_pic")

        if profile_pic and profile_pic.filename:
            filename = secure_filename(profile_pic.filename)

            # UPLOAD TO IMAGEKIT
            try:
                image_url = upload.upload_document(profile_pic, filename)
                updates["photo_url"] = image_url
            except Exception as e:
                print("ImageKit upload failed:", e)
                flash("Profile picture could not be uploaded.")
                return redirect("/profile")
    
    # 3. Update Firestore
    firebase_service.update_user(email, updates)

    # 4. Refresh Session
    updated_user = firebase_service.get_user(email)
    session['user'] = updated_user
    session.modified = True
    
    print("--- UPDATE FINISHED ---")
    return redirect('/profile')
@app.route('/getstarted')
def getstarted():
    return render_template("getstarted.html")
# ---------- EMAIL LOGIN (PYTHON ONLY) ----------

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    id_token = data.get("idToken")

    if not id_token:
        return jsonify({"success": False, "error": "Missing token"}), 400

    try:
        decoded = auth.verify_id_token(id_token)
    except Exception as e:
        print("Token verification error:", e)
        return jsonify({"success": False, "error": "Invalid token"}), 401

    email = decoded.get("email")
    name = decoded.get("name") or email.split("@")[0]
    uid = decoded.get("uid")

    # Check / create user document in Firestore (no password)
    user = firebase_service.get_user(email)
    if not user:
        firebase_service.add_user(email=email, username=name)
        user_data = {"email": email, "username": name, "photo_url": decoded.get("picture", "https://ik.imagekit.io/RemediRX/pngwing.com.png?updatedAt=1764494288724")}

    session["user"] = user_data
    return jsonify({"success": True})


# ---------- GOOGLE LOGIN (CALLED BY JS) ----------

@app.route("/google-login", methods=["POST"])
def google_login():
    data = request.get_json()
    id_token = data.get("idToken")

    if not id_token:
        return jsonify({"success": False, "error": "Missing token"}), 400

    try:
        decoded = auth.verify_id_token(id_token)
    except Exception as e:
        print("Token verification error:", e)
        return jsonify({"success": False, "error": "Invalid token"}), 401

    email = decoded.get("email")
    name = decoded.get("name") or email.split("@")[0]

    # Check if user exists in Firestore; if not, create
    user_data = firebase_service.get_user(email)
    if not user_data:
        photo=decoded.get("picture", "https://ik.imagekit.io/RemediRX/pngwing.com.png?updatedAt=1764494288724")
        firebase_service.add_user(email=email, username=name,photo_url=photo)
        user_data = {"email": email, "username": name, "photo_url": photo}

    session["user"] = user_data    

    return jsonify({"success": True})

@app.route("/firebase-config.js")
def firebase_config_js():
    config = {
        "apiKey": os.environ.get("FIREBASE_API_KEY"),
        "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN"),
        "projectId": os.environ.get("FIREBASE_PROJECT_ID"),
        "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET"),
        "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID"),
        "appId": os.environ.get("FIREBASE_APP_ID")
    }

    js = f"self.FIREBASE_CONFIG = {json.dumps(config)};"
    return Response(js, mimetype="application/javascript")

@app.route('/api/get_firebase_config', methods=['GET'])
def get_firebase_config():
    firebase_config = {
        "apiKey": os.environ.get("FIREBASE_API_KEY"),
        "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN"),
        "projectId": os.environ.get("FIREBASE_PROJECT_ID"),
        "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET"),
        "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID"),
        "appId": os.environ.get("FIREBASE_APP_ID"),
        "vapidKey": os.environ.get("FIREBASE_VAPID_KEY")
    }
    return jsonify(firebase_config)
@app.route('/api/upload_image', methods=['POST'])
def upload_image():
    if 'user' not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    if 'image' not in request.files:
        return jsonify({"success": False, "error": "No image provided"}), 400

    image = request.files['image']

    # Use the same helper as profile upload:
    from werkzeug.utils import secure_filename
    filename = secure_filename(image.filename)

    image_url = upload.upload_document(image, filename)  # ✅ pass file object + name

    if not image_url:
        return jsonify({"success": False, "error": "Upload to ImageKit failed"}), 500

    return jsonify({"success": True, "image_url": image_url})

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect('/')

# ==========================================
# 1. THE CRON TRIGGER (Fire and Forget)
# ==========================================
@app.route('/check_reminders', methods=['GET'])
def check_reminders_route():
    global cron_running
    # 1. Get India Time
    ist = pytz.timezone('Asia/Kolkata')
    now_str = datetime.now(ist).strftime('%H:%M') # e.g., "14:30"
    if cron_running:
        return "Already running", 200
    # 2. Start Background Thread
    cron_running = True
    thread = threading.Thread(target=process_background_notifications_safe, args=(now_str,))
    thread.start()
    
    # 3. Respond Immediately
    return f"Checking for {now_str} in background...", 200
# ============================================
# 2. BACKGROUND THREAD PROCESSING(MESSAGE PROCESSING)
# ============================================
def process_background_notifications_safe(time_str):
    global cron_running
    try:
        process_background_notifications(time_str)
    finally:
        cron_running = False


def process_background_notifications(time_str):
    print(f"🧵 Thread working on: {time_str}")
    
    try:
        # Query Firestore
        firebase_service._user_token_cache.clear()
        docs=firebase_service.get_schedules_by_time(time_str)
        
        # Optimization: Use Batch Sending!
        # Sending 1 by 1 is slow. Sending 500 at a time is fast.
        messages = []

        for doc in docs:
            data = doc.to_dict()
            user_id = data["user_id"]

            tokens = firebase_service.get_user_tokens(user_id)
            if not tokens:
                continue

            for token in tokens:
                messages.append(
                    messaging.Message(
                        notification=messaging.Notification(
                            title="Medicine Reminder",
                            body=f"Time to take {data['med_name']}"
                        ),
                        data={
                        "schedule_id": doc.id,
                        "user_id": user_id,
                        "med_name": data["med_name"],
                        "med_id": data["med_id"],
                        },
                        token=token
                    )
                )
                

            # Firebase limit is 500 messages per batch
            if len(messages) >= 500:
                send_batch(messages)
                messages = [] # Reset list

        # Send remaining messages
        if messages:
            send_batch(messages)
            
        print(f"✅ Thread finished processing for {time_str}")
        
    except Exception as e:
        print(f"❌ Error in background thread: {e}")

def send_batch(messages):
    try:
        batch_response = messaging.send_each(messages)
        print(f"Sent batch of {batch_response.success_count} messages.")
    except Exception as e:
        print(f"Batch send failed: {e}")
#==============================

@app.route("/save-fcm-token", methods=["POST"])
def save_fcm_token():
    if 'user' not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    data = request.get_json()
    print(data)
    token = data.get("token")
    email = session['user']['email']

    if not token:
        return jsonify({"success": False, "error": "No token provided"}), 400

    firebase_service.save_token(email, token)
    return jsonify({"success": True})
#  API for "Take Medicine"
@app.route('/api/mark_taken', methods=['POST'])
def mark_taken_api():
    data = request.json
    # CALL YOUR SERVICE
    result = firebase_service.decrement_inventory_and_log(
        user_id=data['user_id'],
        schedule_id=data['schedule_id']
    )
    return jsonify(result)
@app.route('/notification-action')
def notification_action_page():
    # The HTML will read the URL parameters using JavaScript.
    return render_template('notification_action.html')

@app.route("/firebase-messaging-sw.js")
def sw():
    return send_from_directory("static", "firebase-messaging-sw.js")


@app.route('/save_schedule', methods=['POST'])
def save_schedule():
    data=request.json()
    result=firebase_service.save_schedule(data)
    return result
if __name__ == '__main__':
    app.run(debug=True)
