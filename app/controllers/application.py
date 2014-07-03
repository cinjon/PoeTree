import app
import os
from flask import send_from_directory, render_template, make_response

# special file handlers and error handlers
@app.flask_app.route('/favicon.ico')
def favicon():
    print app.flask_app.root_path
    return send_from_directory(os.path.join(app.flask_app.root_path, 'static'),
           'img/favicon.ico')

@app.flask_app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# routing for basic pages (pass routing onto the Angular app)
@app.flask_app.route('/')
@app.flask_app.route('/about')
@app.flask_app.route('/home')
@app.flask_app.route('/edit')
def basic_pages(**kwargs):
    return make_response(open('app/public/template/index.html').read())
