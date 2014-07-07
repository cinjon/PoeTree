import app
from wit import Wit

def get_wit():
    return Wit(app.wit_access_token)

def push_poets(wit=None, create_new=False):
    wit = wit or get_wit()
    entity_values = [
        {'value':poet.name, 'expressions':[poet.name, poet.name.split(' ')[-1]]} for poet in app.models.Poet.query.filter(app.models.Poet.pushed_to_wit == False).all()]
    if create_new:
        wit.post_entity('poet_name', values=entity_values)
    else:
        wit.update_entity('poet_name', values=entity_values)
    for poet in app.models.Poet.query.filter(app.models.Poet.pushed_to_wit == False).all():
        poet.pushed_to_wit = True
    app.db.session.commit()

def push_poems(wit=None, create_new=False):
    wit = wit or get_wit()
    entity_values = [
        {'value':poem.title, 'expressions':[poem.title]} for poem in app.models.Poem.query.filter(app.models.Poem.pushed_to_wit == False).all()]
    if create_new:
        wit.post_entity('poem_name', values=entity_values)
    else:
        wit.update_entity('poem_name', values=entity_values)
    for poem in app.models.Poem.query.filter(app.models.Poem.pushed_to_wit == False).all():
        poem.pushed_to_wit = True
    app.db.session.commit()

def push_all(create_new=False):
    print "Starting push to Wit"
    wit = get_wit()
    print "Pushing Poets"
    push_poets(wit, create_new)
    print "Done pushing poets. Pushing Poems"
    push_poems(wit, create_new)
    print "Done pushing poems"
