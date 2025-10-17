from flask import jsonify, request, Blueprint
from ..Models.account_models import createAccount, getAccountsByUser, getAccountById, makeMovement, createMovement, createIncome

accountBp = Blueprint('account', __name__)

@accountBp.route('/createAccount', methods=['POST'])
def create_account():
    data = request.get_json()
    name = data.get('name')
    balance = data.get('balance')
    user_id = data.get('user_id')

    # Validate required fields
    if not name or not balance or not user_id:
        return jsonify({"error": "All fields are required."}), 400

    try:
        balance = float(balance)
    except ValueError:
        return jsonify({"error": "Balance must be a valid number."}), 400

    # Try to create account
    created = createAccount(name, balance, user_id)

    if created:
        return jsonify({
            "message": "Account created successfully.",
            "data": {
                "name": name,
                "initial_balance": balance,
                "user_id": user_id
            }
        }), 201
    else:
        return jsonify({"error": "Could not create account. Check the data or try again later."}), 500
    
@accountBp.route('/getUserAccounts', methods=['POST'])
def get_user_accounts():
    data = request.get_json()
    user_id = data.get('user_id')
    
    # Validate required fields
    if not user_id:
        return jsonify({"error": "The user_id field is required."}), 400
    
    accounts = getAccountsByUser(user_id)
    if accounts:
        return jsonify({
            "message": "Accounts retrieved successfully.",
            "data": accounts
        }), 200
    else:
        return jsonify({"error": "Could not retrieve accounts. Check the data or try again later."}), 500
    
@accountBp.route('/makeMovement', methods=['POST'])
def make_movement():
    data = request.get_json()
    user_id = data.get('user_id')
    account_id_a = data.get('account_id_a')  # Source account
    account_id_b = data.get('account_id_b')  # Destination account
    amount = data.get('amount')

    # ✅ Validate required fields
    if not all([user_id, account_id_a, account_id_b, amount]):
        return jsonify({"error": "All fields are required."}), 400

    # ✅ Validate that amount is numeric and positive
    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than 0."}), 400
    except ValueError:
        return jsonify({"error": "Amount must be a valid number."}), 400

    # 🔎 Verify that accounts exist
    value_a = getAccountById(account_id_a)
    value_b = getAccountById(account_id_b)

    if not value_a or not value_b:
        return jsonify({"error": "One or both accounts do not exist."}), 404

    balance_a = float(value_a[0])  # Source account balance
    balance_b = float(value_b[0])  # Destination account balance

    # 🚫 Validate sufficient funds in source account
    if amount > balance_a:
        return jsonify({
            "error": f"Insufficient funds in source account (Current balance: {balance_a}, Amount: {amount})."
        }), 400

    # 🧮 Calculate new balances
    new_balance_a = balance_a - amount
    new_balance_b = balance_b + amount

    print(f"DEBUG: balance_a={balance_a}, balance_b={balance_b}, new_a={new_balance_a}, new_b={new_balance_b}")

    # 🔄 Update balances
    completed = makeMovement(account_id_a, new_balance_a, account_id_b, new_balance_b)

    if completed:
        # 🧾 Register the movement
        movement_created = createMovement(user_id, amount, account_id_a, account_id_b)

        if movement_created:
            return jsonify({
                "message": "Movement completed successfully.",
                "data": {
                    "source_account": account_id_a,
                    "destination_account": account_id_b,
                    "amount": amount,
                    "source_previous_balance": balance_a,
                    "source_new_balance": new_balance_a,
                    "destination_previous_balance": balance_b,
                    "destination_new_balance": new_balance_b
                }
            }), 200
        else:
            return jsonify({"error": "Could not register the movement in the database."}), 500
    else:
        return jsonify({"error": "Could not update balances. Try again."}), 500    
    
@accountBp.route('/makeEntry', methods=['POST'])
def make_entry():
    data = request.get_json()
    user_id = data.get('user_id')
    account_id = data.get('account_id')
    amount = data.get('amount')
    
    if not user_id or not account_id or not amount:
        return jsonify({"error": "All fields are required."}), 400
    
    try:
        amount = float(amount)
    except ValueError:
        return jsonify({"error": "Amount must be numeric."}), 400

    account = getAccountById(account_id)
    if not account:
        return jsonify({"error": "Account does not exist."}), 404

    current_balance = float(account[0])
    new_balance = current_balance + amount

    completed = createIncome(user_id, amount, account_id, new_balance)
    
    if completed:
        return jsonify({
            "message": "Income completed successfully.",
            "data": {
                "account": account_id,
                "amount": amount,
                "new_balance": new_balance
            }
        }), 200
    else:
        return jsonify({"error": "Could not complete the income."}), 500    
    
