import os
from flask import Flask, render_template
from .routes.auth_routes import auth_bp

# Rutas absolutas a templates y static
template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend/templates')
static_dir   = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend/static')

# Crear app indicando las carpetas
app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

# Registrar blueprint
app.register_blueprint(auth_bp, url_prefix='/auth')

# Ruta principal
@app.route('/')
def index():
    return render_template('login.html')

@app.route('/register')
def register():
    return render_template('register.html')

if __name__ == '__main__':
    app.run(debug=True)
