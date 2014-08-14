import app
import os
from flask import send_from_directory, render_template, make_response
from  sqlalchemy.sql.expression import func, select
import random

find_limit = 5
typeahead_limit = 10

# special file handlers and error handlers
@app.flask_app.route('/favicon.ico')
def favicon():
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

@app.flask_app.route('/randompoem')
def randompoem():
    # p = app.models.Poem.query.order_by(func.random()).first() #Get random poem
    import random
    poems = [p for p in app.models.Poem.query.all() if p.audios.count() > 0]
    random.shuffle(poems)
    p = poems[0]
    if not p:
        return app.utility.xhr_response(
            {'success':False}, 400)
    return app.utility.xhr_response(
        {'success':True, 'poem':p.display()}, 200)

@app.flask_app.route('/typeahead/<query>')
@app.flask_app.route('/all')
def typeahead(query=None):
    query = query.lower()
    poems = app.models.Poem.query.all()
    poets = app.models.Poet.query.all()
    if query is not None:
        poets = get_matching(poets, query)
        poems = get_matching(poems, query)

    data = [{'name':p.get_name(), 'ty':'poet'} for p in sorted(poets, key=lambda p:len(p.name))][:typeahead_limit]
    data += [{'name':p.get_title(), 'ty':'poem'} for p in sorted(poems, key=lambda p:len(p.title), reverse=True)][:typeahead_limit]
    return app.utility.xhr_response({'data':data}, 200)

@app.flask_app.route('/get_data/<ty>/<name>')
def get_data(ty, name):
    """ty is either poet or poem. name is the exact name of the poet/poem"""
    name = name.lower()
    p = None
    if ty == 'poet':
        p = app.models.Poet.query.filter(app.models.Poet.name == name).first()
    elif ty == 'poem':
        p = app.models.Poem.query.filter(app.models.Poem.title == name).first()

    if p:
        return app.utility.xhr_response({'success':True, 'data':p.display()}, 200)
    return app.utility.xhr_response({'success':False}, 400)

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
        ret['type'] = 'multi'
        return app.utility.xhr_response(ret, 200)

    ret = {'success':False}
    return app.utility.xhr_response(ret, 200)

def get_matching(objs, query):
    # Given a list of objs (poems or poets), get those that match the query
    # Return them in order of matching score
    return [p for p,score in sorted([(p, p.check_match(query)) for p in objs], key=lambda k:k[1], reverse=True) if score > 0]
