from flask import Flask, request, jsonify, session, render_template, redirect, url_for, flash
from services import firebase_service
from firebase_admin import auth
import os

# Initialize Flask
app = Flask(__name__)
app.secret_key = "supersecretkey"  # change this before deployment

# Routes
@app.route('/')

def home():
    if 'user' in session:
       
        return render_template("home.html", user=session['user']['username'])

    return render_template("home.html")
@app.route('/about')
def about():
    return render_template("aboutus.html")
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

    # Create Flask session
    session["user"] = {"email": email, "username": name, "uid": uid}

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
    user = firebase_service.get_user(email)
    if not user:
        firebase_service.add_user(email=email, username=name, password_hash=None)

    session["user"] = {"email": email, "username": name, "uid": decoded.get("uid")}


    return jsonify({"success": True})
@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect('/')


if __name__ == '__main__':
    app.run(debug=True)
