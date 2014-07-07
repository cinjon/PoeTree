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
def basic_pages(**kwargs):
    return make_response(open('app/public/template/index.html').read())

@app.flask_app.route('/poet/<name>')
def poet_page(name):
    print 'poet: %s' % name
    poet = app.models.Poet.query.filter(app.models.Poet.name == name.lower()).first()
    if not poet:
        return app.utility.xhr_response(
            {'success':False}, 200)
    else:
        return app.utility.xhr_response(
            {'success':True, 'poems':poet.display_poems(), 'poet':poet.get_name()}, 200)

@app.flask_app.route('/poem/<title>')
def poem_page(title):
    poems = app.models.Poem.query.filter(app.models.Poem.title == title.lower()).all()
    if not poems:
        return app.utility.xhr_response(
            {'success':False}, 200)
    else:
        if len(poems) == 1:
            success = 'single'
        else:
            success = 'list'
        poems = [p.display_self() for p in poems]
        return app.utility.xhr_response(
            {'success':success, 'poems':poems}, 200)
