from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

app = Flask(__name__, static_folder='build', static_url_path='')
CORS(app)

# Example JSON data
data = [
    {
        "problem": "Compute the derivative of $$f(x) = x^2$$",
        "solution": "$$f'(x) = 2x$$"
    },
    {
        "problem": "Integrate $$\\int x \\, dx$$",
        "solution": "$$\\frac{1}{2} x^2 + C$$"
    },
    {
        "problem": "Solve for x: $$2x + 3 = 7$$",
        "solution": "$$x = 2$$"
    }
]

@app.route('/api/problems')
def get_problems():
    return jsonify(data)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and path.startswith('static'):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
