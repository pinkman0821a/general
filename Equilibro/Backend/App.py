import os
from flask import Flask, render_template
from .Routes.AuthRoutes import auth_bp

TemplateDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../FrontEnd/Templates')
StaticDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../FrontEnd/Static')

app = Flask(__name__, template_folder=TemplateDir, static_folder=StaticDir)

app.register_blueprint(auth_bp, url_prefix='/auth')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/Dashboard')
def dashboard_page():
    return render_template('dashboard.html')

if __name__ == '__main__':
    app.run(debug=True)