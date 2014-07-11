import app
import os
from flask import send_from_directory, render_template, make_response

find_limit = 5

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

@app.flask_app.route('/find/<query>')
def find(query):
    # We got a query that could be a poem or a poet. It could also be a fragment
    # If any are a perfect match, return that. Otherwise, return a list of the top five poems and top five poets that match the query term in some way.
    query = query.lower()
    poems = app.models.Poem.query.all()
    poets = app.models.Poet.query.all()
    ret = {}
    for p in poets:
        if p.name.lower() == query:
            # Found an exact match in poets
            ret['success'] = True
            ret['poet'] = p.display()
            ret['type'] = 'single-poet'
            return app.utility.xhr_response(ret, 200)
    for p in poems:
        if p.title.lower() == query:
            # Found an exact match in poems
            ret['success'] = True
            ret['poem'] = p.display()
            ret['type'] = 'single-poem'
            return app.utility.xhr_response(ret, 200)

    # Found neither as exact matches. Let's see if we can find close matches
    poets = get_matching(poets, query)
    poems = get_matching(poems, query)
    if poems or poets:
        ret['success'] = True
        ret['poems'] = [p.display() for p in poems[:find_limit]]
        ret['poets'] = [p.display() for p in poets[:find_limit]]
        ret['type'] = ret['multi']
        return app.utility.xhr_response(ret, 200)

    ret = {'success':False}
    return app.utility.xhr_response(ret, 200)

def get_matching(objs, query):
    # Given a list of objs (poems or poets), get those that match the query
    # Return them in order of matching score
    matching = [(p, score) for p,score in [p.check_match(query) for p in objs] if score > 0]
    print matching
    return [p for p,score in sorted(matching, key=lambda k:k[1], reverse=True)]
