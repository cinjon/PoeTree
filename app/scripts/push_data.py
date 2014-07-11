import app
from wit import Wit

def get_wit():
    return Wit(app.wit_access_token)

def push_poets(wit=None):
    wit = wit or get_wit()
    entity_values = [
        {'value':poet.name, 'expressions':[poet.name, poet.name.split(' ')[-1]]} for poet in app.models.Poet.query.filter(app.models.Poet.pushed_to_wit == False).all()]
    wit.update_entity('poet', values=entity_values)

    for poet in app.models.Poet.query.filter(app.models.Poet.pushed_to_wit == False).all():
        poet.pushed_to_wit = True
    app.db.session.commit()

def push_poems(wit=None):
    wit = wit or get_wit()
    entity_values = [
        {'value':poem.title, 'expressions':[poem.title]} for poem in app.models.Poem.query.filter(app.models.Poem.pushed_to_wit == False).all()]
    wit.update_entity('poem', values=entity_values)
    for poem in app.models.Poem.query.filter(app.models.Poem.pushed_to_wit == False).all():
        poem.pushed_to_wit = True
    app.db.session.commit()

def push_all():
    print "Starting push to Wit"
    wit = get_wit()
    print "Pushing Poets:"
    push_poets(wit)
    print "Done pushing poets."
    print "Pushing Poems:"
    push_poems(wit)
    print "Done pushing poems"
