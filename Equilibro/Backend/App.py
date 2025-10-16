import os
from flask import Flask, render_template
from .Routes.AuthRoutes import auth_bp
from .Routes.FeaturesRoutes import features_bp

TemplateDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../FrontEnd/Templates')
StaticDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../FrontEnd/Static')

app = Flask(__name__, template_folder=TemplateDir, static_folder=StaticDir)

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(features_bp, url_prefix='/features')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/Dashboard')
def dashboard_page():
    return render_template('dashboard.html')

@app.route('/Questions')
def questions_page():
    return render_template('questions.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)