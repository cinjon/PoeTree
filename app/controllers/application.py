import app
import os
from flask import send_from_directory, make_response, request, redirect
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
    return redirect('/')

# routing for basic pages (pass routing onto the Angular app)
@app.flask_app.route('/')
@app.flask_app.route('/about')
@app.flask_app.route('/home')
@app.flask_app.route('/discover')
def basic_pages(**kwargs):
    return make_response(open('app/public/template/index.html').read())

def make_response_by_route(route, model):
    if route and model.query.filter(model.route == route).first():
        return make_response(open('app/public/template/index.html').read())
    return redirect('/')

@app.flask_app.route('/poet/<route>')
def poet(route):
    return make_response_by_route(route, app.models.Poet)

@app.flask_app.route('/poem/<route>')
def poem(route):
    return make_response_by_route(route, app.models.Poem)

@app.flask_app.route('/random-poem-route')
def random_poem_route():
    p = app.models.Poem.query.order_by(func.random()).first() #Get random poem
    return app.utility.xhr_response(
        {'success':True, 'route':p.route}, 200)

@app.flask_app.route('/all-poets')
def all_poets():
    poets = [{'name':p.get_name(), 'ty':'poet', 'route':p.route} for p in sorted(app.models.Poet.query.all(), key=lambda p:len(p.name))]
    return app.utility.xhr_response({'poets':poets}, 200)

@app.flask_app.route('/typeahead/<query>')
def typeahead(query=None):
    poets = app.models.Poet.query.all()
    poems = app.models.Poem.query.all()
    if query is not None:
        query = query.lower()
        poets = get_matching(poets, query)[:typeahead_limit]
        poems = get_matching(poems, query)[:typeahead_limit]

    poets = [{'name':p.get_name(), 'ty':'poet', 'route':p.route} for p in sorted(poets, key=lambda p:len(p.name))]
    poems = [{'name':p.get_title(), 'ty':'poem', 'route':p.route} for p in sorted(poems, key=lambda p:len(p.title), reverse=True)]
    return app.utility.xhr_response({'poets':poets, 'poems':poems}, 200)

@app.flask_app.route('/save-record', methods=['POST'])
def save_record():
    blob = request.files['file']
    route = request.form['route']
    poems_unset = app.audiodir + '/poems-unset/'
    poems_set = app.audiodir + '/poems-set/'
    if not blob:
        return app.utility.xhr_response({'success':False, 'msg':"Your voice is too powerful. The hamsters got scared. Please try again."}, 200)
    elif not route:
        return app.utility.xhr_response({'success':False, 'msg':"There was a mistake. The hamsters are on it."}, 200)

    try:
        poem = app.models.Poem.query.filter(app.models.Poem.route == route.lower()).first()
        filename_template = poem.poet.name + ' ' + poem.title
        filename = app.models.get_next_audio(filename_template, poem.audios.count())
        if not poem:
            raise
        ext = '.wav'
        blob.save(poems_unset + filename + ext) # save the file successfully
        audio = app.models.create_audio(poem.id, ext, filename_template) # then create the audio
        app.utility.mv(poems_unset + filename + ext, poems_set + filename + ext) # then move the file to the right dir
        return app.utility.xhr_response({'success':True, 'poem':poem.display(audio)}, 200)
    except Exception, e:
        return app.utility.xhr_response({'success':False, 'msg':"Sorry, the hamsters couldn't find a good shelf for that. Please try again."}, 200)

@app.flask_app.route('/get-data/<ty>/<route>')
def get_data(ty, route):
    """ty is either poet or poem. route is the exact route of the poet/poem"""
    route = route.lower()
    p = None
    if ty == 'poet':
        p = app.models.Poet.query.filter(app.models.Poet.route == route).first()
    elif ty == 'poem':
        p = app.models.Poem.query.filter(app.models.Poem.route == route).first()

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
