import re,bcrypt, jwt, datetime

def HashContrasena(contrasena: str) -> str:
    """hash a password for storing."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(contrasena.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def VerificarContrasena(contrasena: str, hashed: str) -> bool:
    """check hashed password. Using bcrypt, the salt is saved into the hash itself"""
    return bcrypt.checkpw(contrasena.encode('utf-8'), hashed.encode('utf-8'))

def ValidarRegistro(nombreusuario: str, email: str, contrasena: str) -> tuple[bool, str]:
    """validate user registration data"""
    if not re.match(r'^[a-zA-ZÀ-ÿ\s]{3,100}$', nombreusuario):
        return False, "El nombre debe tener entre 3 y 100 caracteres y solo puede contener letras y espacios."
    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        return False, "El correo electrónico no es válido."
    if len(contrasena) < 8:
        return False, "La contraseña debe tener al menos 8 caracteres."
    if not re.search(r'[A-Z]', contrasena):
        return False, "La contraseña debe contener al menos una letra mayúscula."
    if not re.search(r'[a-z]', contrasena):
        return False, "La contraseña debe contener al menos una letra minúscula."
    if not re.search(r'[0-9]', contrasena):
        return False, "La contraseña debe contener al menos un número."
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', contrasena):
        return False, "La contraseña debe contener al menos un carácter especial."
    return True, "Datos de registro válidos."

def GenerarTokenJWT(nombreusuario: str, correo: str, usuario_id: int, secret_key: str, expires_in: int ) -> str:
    """generate a JWT token for user authentication"""
    payload = {
        "sub": usuario_id,
        "name": nombreusuario,
        "email": correo,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_in)
    }
    token = jwt.encode(payload, secret_key, algorithm="HS256")
    return token