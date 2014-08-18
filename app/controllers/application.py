import app
import os
from flask import send_from_directory, render_template, make_response, request
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
    poems = app.models.Poem.query.all()
    poets = app.models.Poet.query.all()
    if query is not None:
        query = query.lower()
        poets = get_matching(poets, query)[:typeahead_limit]
        poems = get_matching(poems, query)[:typeahead_limit]

    poets = [{'name':p.get_name(), 'ty':'poet'} for p in sorted(poets, key=lambda p:len(p.name))]
    poems = [{'name':p.get_title(), 'ty':'poem'} for p in sorted(poems, key=lambda p:len(p.title), reverse=True)]
    return app.utility.xhr_response({'poets':poets, 'poems':poems}, 200)

@app.flask_app.route('/save-record', methods=['POST'])
def save_record():
    app.flask_app.logger.debug('in save-record')
    app.flask_app.logger.debug(request.form.keys())
    blob = request.files['file']
    app.flask_app.logger.debug('got file')
    title = request.form['title']
    app.flask_app.logger.debug('got title')
    poems_unset = app.audiodir + '/poems-unset/'
    poems_set = app.audiodir + '/poems-set/'
    if not blob:
        app.flask_app.logger.debug('not blob')
        return app.utility.xhr_response({'success':False, 'msg':"Your voice is too powerful. The hamsters got scared. Please try again."}, 200)
    elif not title:
        app.flask_app.logger.debug('not title')
        return app.utility.xhr_response({'success':False, 'msg':"There was a mistake. The hamsters are on it."}, 200)
    filename = blob.filename
    app.flask_app.logger.debug(title)
    try:
        poem = app.models.Poem.query.filter(app.models.Poem.title == title.lower()).first()
        app.flask_app.logger.debug('got poem')
        if not poem:
            app.flask_app.logger.debug('no poem with title %s' % title.lower())
            raise
        ext = '.wav'
        blob.save(poems_unset + filename + ext)
        app.flask_app.logger.debug('saved blob')
        audio = app.models.create_audio(poem.id, ext, filename)
        app.flask_app.logger.debug('craeted audio %d' % audio.id)
        app.utility.mv(poems_unset + filename + ext, poems_set + filename + ext)
        app.flask_app.logger.debug('moved audio')
        return app.utility.xhr_response({'success':True, 'poem':poem.display()}, 200)
    except Exception, e:
        return app.utility.xhr_response({'success':False, 'msg':"Sorry, the hamsters couldn't find a good shelf for that. Please try again."}, 200)

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
