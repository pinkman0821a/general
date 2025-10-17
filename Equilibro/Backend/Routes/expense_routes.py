from flask import jsonify, request, Blueprint
from ..Models.expense_models import createCategory, getCategoriesByUser, createExpense, getExpensesByUser, getMonthlyExpenses, getExpensesByMonthAndYear,getExpensesDetailsByMonthAndYear
from ..Models.account_models import getAccountById, getMovementsByUser, getIncomesByUser, getAccountsByUserId

expenseBp = Blueprint('expense', __name__)

@expenseBp.route('/createCategory', methods=['POST'])
def create_category():
    data = request.get_json()
    name = data.get('name')
    user_id = data.get('user_id')

    # Validate required fields
    if not name or not user_id:
        return jsonify({"error": "All fields are required."}), 400

    # Try to create category
    created = createCategory(name, user_id)

    if created:
        return jsonify({
            "message": "Category created successfully.",
            "data": {
                "name": name,
                "user_id": user_id
            }
        }), 201
    else:
        return jsonify({"error": "Could not create category. Check the data or try again later."}), 500
    
@expenseBp.route('/getUserCategories', methods=['POST'])
def get_user_categories():
    data = request.get_json()
    user_id = data.get('user_id')
    
    # Validate required fields
    if not user_id:
        return jsonify({"error": "The user_id field is required."}), 400
    
    categories = getCategoriesByUser(user_id)
    if categories:
        return jsonify({
            "message": "Categories retrieved successfully.",
            "data": categories
        }), 200
    else:
        return jsonify({"error": "Could not retrieve categories. Check the data or try again later."}), 500
    
@expenseBp.route('/createExpense', methods=['POST'])
def create_expense():
    data = request.get_json()
    value = data.get('value')
    description = data.get('description')
    account_id = data.get('account_id')
    category_id = data.get('category_id')
    user_id = data.get('user_id')

    # 🧩 Validate required fields
    if not all([value, description, account_id, category_id, user_id]):
        return jsonify({"error": "All fields are required."}), 400

    # 💰 Validate that value is numeric and positive
    try:
        value = float(value)
        if value <= 0:
            return jsonify({"error": "Value must be greater than 0."}), 400
    except ValueError:
        return jsonify({"error": "Value must be a valid number."}), 400

    # 🔎 Verify that account exists
    account = getAccountById(account_id)
    if not account:
        return jsonify({"error": "Account does not exist."}), 404

    current_balance = float(account[0])

    # 🚫 Validate sufficient funds
    if value > current_balance:
        return jsonify({"error": "Insufficient funds to make this expense."}), 400

    # 🧮 Calculate new balance
    new_balance = current_balance - value

    # 📝 Try to create expense and update balance
    created = createExpense(value, description, account_id, category_id, user_id, new_balance)

    if created:
        return jsonify({
            "message": "Expense created successfully.",
            "data": {
                "value": value,
                "description": description,
                "account_id": account_id,
                "category_id": category_id,
                "user_id": user_id,
                "previous_balance": current_balance,
                "new_balance": new_balance
            }
        }), 201
    else:
        return jsonify({"error": "Could not create expense. Check the data or try again later."}), 500
    
@expenseBp.route('/getUserExpenses', methods=['POST'])
def get_user_expenses():
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "The user_id field is required."}), 400
    
    # Queries
    expenses = getExpensesByUser(user_id) or []
    movements = getMovementsByUser(user_id) or []
    incomes = getIncomesByUser(user_id) or []

    # Final lists (empty by default)
    expenses_list = []
    movements_list = []
    incomes_list = []

    # Convert results into manageable lists
    if incomes:
        incomes_list = [
            [income[0], income[1], "Income", income[2], "Income"]
            for income in incomes
        ]

    if movements:
        movements_list = [
            [movement[0], movement[1], movement[2] + " Movement", movement[3], "Movement"]
            for movement in movements
        ]

    if expenses:
        expenses_list = [
            [expense[0], expense[1], expense[2], expense[3], expense[4]]
            for expense in expenses
        ]

    # Combine all data (there may be only some)
    total_data = expenses_list + movements_list + incomes_list

    if total_data:
        return jsonify({
            "message": "Data retrieved successfully.",
            "data": total_data
        }), 200
    else:
        return jsonify({"error": "No records available for this user."}), 404
    
@expenseBp.route('/totalBalance', methods=['POST'])
def total_balance():
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "All fields are required."}), 400
    
    result = getAccountsByUserId(user_id)
    
    if result:
        return jsonify({
            "data": result
        }), 200
    else:
        return jsonify({"error": "Could not retrieve accounts"}), 500    
    
@expenseBp.route('/monthlyExpenses', methods=['POST'])
def monthly_expenses():
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "The user_id field is required."}), 400
    
    result = getMonthlyExpenses(user_id)
    
    if result is not None:
        return jsonify({
            "data": result
        }), 200
    else:
        return jsonify({"error": "Could not retrieve monthly expenses."}), 500    
    

@expenseBp.route('/getExpensesByMonthAndYear', methods=['POST'])   
def get_expenses_by_month_and_year():
    data = request.get_json()
    user_id = data.get('user_id')
    month = data.get('month')
    year = data.get('year')
    
    if not user_id or not month or not year:
        return jsonify({"error": "The user_id, month, and year fields are required."}), 400
    
    result = getExpensesByMonthAndYear(user_id, month, year)
    
    if result is not None:
        return jsonify({
            "data": result
        }), 200
    else:
        return jsonify({"error": "Could not retrieve expenses for the specified month and year."}), 500
    
@expenseBp.route('/getExpensesDetailsByMonthAndYear', methods=['POST'])   
def get_expenses_details_by_month_and_year():
    data = request.get_json()
    user_id = data.get('user_id')
    month = data.get('month')
    year = data.get('year')
    
    if not user_id or not month or not year:
        return jsonify({"error": "The user_id, month, and year fields are required."}), 400
    
    result = getExpensesDetailsByMonthAndYear(user_id, month, year)
    
    if result is not None:
        return jsonify({
            "data": result
        }), 200
    else:
        return jsonify({"error": "Could not retrieve expenses for the specified month and year."}), 500