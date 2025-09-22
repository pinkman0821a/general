import re # Regular expression module for input validation
import bcrypt # Library for hashing passwords
import jwt # Library for creating and verifying JSON Web Tokens
import datetime # Module for handling date and time

# this function hashes a password using bcrypt
def hash_password(password: str) -> str:
    """Hash a password for storing."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

# ths function checks a password against a hashed password
def check_password(password: str, hashed: str) -> bool:
    """Check a hashed password against a user-provided password."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# this function validates username and password 
def validate_registration(username: str, password: str) -> tuple[bool, str]:
    """Validate username and password for registration."""
    if not username or len(username) < 3:
        return False, "Username must be at least 3 characters long."
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return False, "Password must contain both letters and numbers."
    return True, "validate success"

def create_jwt(user_id: int, secret: str, exp_delta_seconds: int) -> str:


    payload = {
        'sub': user_id,
        'iat': datetime.datetime.utcnow(),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=exp_delta_seconds)
    }
    token = jwt.encode(payload, secret, algorithm='HS256')
    return token