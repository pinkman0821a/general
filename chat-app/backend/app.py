import os
from flask import Flask, render_template
from .routes.auth_routes import auth_bp
from .routes.chat_routes import chat_bp
from .sockets import socketio
from .sockets import chat_socket

# rutas absolutas a templates y static
template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend/templates')
static_dir   = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend/static')

# crear app
app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

# inicializar socketio con la app aquí
socketio.init_app(app)

# blueprints
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(chat_bp, url_prefix='/chat')

# rutas principales
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
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
