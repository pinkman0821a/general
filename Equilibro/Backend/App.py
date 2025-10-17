import os
from flask import Flask, render_template
from .Routes.auth_routes import authBp
from .Routes.account_routes import accountBp
from .Routes.expense_routes import expenseBp

templateDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../FrontEnd/Templates')
staticDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../FrontEnd/Static')

app = Flask(__name__, template_folder=templateDir, static_folder=staticDir)

app.register_blueprint(authBp, url_prefix='/auth')
app.register_blueprint(accountBp, url_prefix='/account')
app.register_blueprint(expenseBp, url_prefix='/expense')

@app.route('/')
def login():
    return render_template('login.html')

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/questions')
def questions():
    return render_template('questions.html')

@app.route('/dashBoard')
def dashBoard():
    return render_template('dashBoard.html')

@app.route('/historicalExpenses')
def historicalExpenses():
    return render_template('historicalExpenses.html')
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)