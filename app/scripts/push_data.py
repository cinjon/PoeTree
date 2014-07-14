import app
from wit import Wit

def get_wit(version='20140510'):
    return Wit(app.wit_access_token, version=version)

def push_poets(wit=None):
    wit = wit or get_wit()
    entity_values = [{'value':poet.name, 'expressions':[poet.name, poet.name.split(' ')[-1]]} for poet in app.models.Poet.query.all()]
    wit.update_entity('poet', values=entity_values)

def push_poems(wit=None):
    wit = wit or get_wit()
    entity_values = [{'value':poem.title, 'expressions':[poem.title]} for poem in app.models.Poem.query.all()]
    wit.update_entity('poem', values=entity_values)

find_prefixes = ['', 'get', 'find', 'search', 'return', 'retrieve', 'the']
def make_outcome(intent, entity, msg, phrase, value):
    if msg not in phrase:
        return None
    return {
        "intent": intent, "confidence":1.0,
        "entities": {
            entity:{
                "end":phrase.find(msg) + len(msg),
                "start":phrase.find(msg),
                "value":value,
                "body":phrase
                }
            }
        }

def _expressions_to_train(title):
    # Splits title up s.t. we train on the title as well as anything in parentheses
    first_open_parentheses = title.find('(')
    first_closed_parentheses = title.find(')')
    if first_closed_parentheses == first_open_parentheses == -1:
        #No closed or open parens
        return [title]
    elif first_closed_parentheses == -1:
        #Just open parens, no closed. Remove the opens and train on each expression
        return title.split('(')
    elif first_open_parentheses == -1:
        #Just closed parens, no open. Remove the closed and train on each expression
        return title.split(')')
    else:
        #At least one set of parentheses, e.g. 'blah (dd) (e)' or 'blah (d(ff))'
        #Get the stuff before the first_parens, then recurse
        pre_split = [title[:first_open_parentheses].strip()]
        inner_split = _expressions_to_train(
            title[first_open_parentheses+1:first_closed_parentheses].strip())
        post_split = _expressions_to_train(
            title[first_closed_parentheses+1:].strip())
        return pre_split + inner_split + post_split

def _generic_train_find(wit, lst, entity):
    for l in lst:
        print l
        for expression in _expressions_to_train(l['name']):
            if not expression:
                continue
            for prefix in find_prefixes:
                body = '%s %s' % (prefix, expression)
                body = body.strip()
                outcomes = [make_outcome('find', entity, expression, body, l['name'])]
                if 'poet' in l:
                    body += ' by %s' % l['poet']
                    outcomes.append(make_outcome('find', entity, expression, body, l['name']))
                for outcome in outcomes:
                    wit.post_expression(expression, outcome)

def train_on_poems():
    print "Training Poems"
    _generic_train_find(
        get_wit('20140417'), [{'name':p.title, 'poet':p.poet.name} for p in app.models.Poem.query.all()], 'poem')

def train_on_poets():
    print "Training Poets"
    _generic_train_find(
        get_wit('20140417'), [{'name':p.name} for p in app.models.Poet.query.all()], 'poet')

def push_all():
    print "Starting push to Wit"
    wit = get_wit()
    print "Pushing Poets:"
    push_poets(wit)
    print "Done pushing poets."
    print "Pushing Poems:"
    push_poems(wit)
    print "Done pushing poems"
