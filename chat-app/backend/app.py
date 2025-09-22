import os
from flask import Flask, render_template
from .routes.auth_routes import auth_bp
from .routes.chat_routes import chat_bp

# Rutas absolutas a templates y static
template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend/templates')
static_dir   = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend/static')

# Crear app indicando las carpetas
app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

# Registrar blueprint
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(chat_bp, url_prefix='/chat')


# Ruta principal
@app.route('/')
def index():
    return render_template('login.html')

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

if __name__ == '__main__':
    app.run(debug=True)
