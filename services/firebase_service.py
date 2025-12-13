import firebase_admin
from firebase_admin import credentials, firestore, auth, storage
import os,json
firebase_creds = os.environ.get("FIREBASE_CONFIG")

if firebase_creds:
    cred_dict = json.loads(firebase_creds)
    cred = credentials.Certificate(cred_dict)
else:
    # fallback for local dev
    raise Exception("FIREBASE_SERVICE_ACCOUNT environment variable not set")

# Avoid 'app already exists' error if this file is imported more than once
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()


# --- User Functions ---
def add_user(email, username,photo_url):
    user_ref = db.collection("users").document(email)
    user_ref.set({
        "username": username,
        "email": email,
        "created_at": firestore.SERVER_TIMESTAMP,
        "hydration_enabled": False,
        "photo_url":photo_url
    })

def get_user(email):
    return db.collection("users").document(email).get().to_dict()

# --- Medicine Functions ---
def add_medicine(email, medicine_data):
    med_ref = db.collection("users").document(email).collection("medicines").document()
    med_ref.set(medicine_data)
    return med_ref.id

def get_medicines(email):
    meds = db.collection("users").document(email).collection("medicines").stream()
    results = []
    for doc in meds_stream:
        # doc.to_dict() gets the data: {'med_name': 'X', 'qty': 10}
        data = doc.to_dict()
        
        # doc.id gets the document name: '7tEp9...'
        # We inject it into the dictionary so the frontend knows this ID
        data['medicine_id'] = doc.id 
        
        results.append(data)
        
    return results

def update_medicine(email, med_id, data):
    db.collection("users").document(email).collection("medicines").document(med_id).update(data)

def update_user(email, data):
    """
    Updates an existing user document.
    :param email: The user's email (Document ID)
    :param data: A dictionary of fields to update (e.g., {'age': '20', 'gender': 'male'})
    """
    try:
        user_ref = db.collection("users").document(email)
        user_ref.update(data)
        return True
    except Exception as e:
        print(f"Error updating user {email}: {e}")
        return False
def save_token(email, token):
    user_ref = db.collection("users").document(email)
    user_ref.update({
        "fcm_token": token
    })
def get_token(email):
    user_doc = db.collection("users").document(email).get()
    if user_doc.exists:
        user_data = user_doc.to_dict()
        return user_data.get("fcm_token")
    return None
                
def save_schedule(data):
    # Save directly to Firestore
    # We use a Collection Group structure so we can search ALL users at once later
    db.collection('users').document(data['user_id']).collection('schedules').add({
        'med_id': data['med_id'],
        'med_name': data['med_name'],
        'time': data['time'], # Format must be "HH:MM" (24 hour)
        'token': data['token'],
        'user_id': data['user_id']
    })
    
    return jsonify({"status": "Saved to database"})

def decrement_inventory_and_log(user_id, schedule_id):
    if not user_id or not schedule_id:
        return jsonify({"error": "Missing data"}), 400

    # 1. Reference the Schedule to get Medicine Details
    # (Assuming schedule doc is at: users/{uid}/schedules/{schedule_id})
    sched_ref = db.collection('users').document(user_id).collection('schedules').document(schedule_id)
    
    try:
        # Use a Transaction to safely decrement inventory
        new_quantity = run_inventory_transaction(db.transaction(), sched_ref, user_id)
        return jsonify({"status": "success", "remaining_quantity": new_quantity})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@firestore.transactional
def run_inventory_transaction(transaction, sched_ref, user_id):
    # 1. Read the Schedule to find the Medicine Name or Inventory Link
    sched_snap = sched_ref.get(transaction=transaction)
    if not sched_snap.exists:
        raise Exception("Schedule not found")
        
    sched_data = sched_snap.to_dict()
    
    # 2. Logic to find the actual Inventory Document
    # OPTION A: If 'current_quantity' is stored directly inside the Schedule document
    current_qty = sched_data.get('current_quantity', 0)
    med_name = sched_data.get('med_name')

    # 3. Decrement
    if current_qty > 0:
        new_qty = current_qty - 1
        transaction.update(sched_ref, {'current_quantity': new_qty})
        
        # 4. LOG IT (Create a new document in 'logs')
        log_ref = db.collection('users').document(user_id).collection('logs').document()
        transaction.set(log_ref, {
            'med_name': med_name,
            'action': 'taken',
            'timestamp': firestore.SERVER_TIMESTAMP,
            'schedule_id': sched_ref.id
        })
        
        return new_qty
    else:
        # Stock is 0, just log it anyway but don't decrement
        return 0

def get_schedules_by_time(time_str):
    docs = db.collection_group('schedules').where('time', '==', time_str).stream()
    return docs