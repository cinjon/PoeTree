from app import db
from app import utility

class Poet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text())
    poems = db.relationship('Poem', lazy='dynamic', backref='poet')
    creation_time = db.Column(db.DateTime)
    pushed_to_wit = db.Column(db.Boolean)

    def __init__(self, name):
        self.name = name
        self.creation_time = utility.get_time()
        self.pushed_to_wit = False

    def get_name(self):
        return self.name.title()

    def wit_entity_id(self):
        return 'poet_name'

    def display_poems(self):
        return [poem.display_self() for poem in self.poems.all()]

def create_poet(name):
    poet = Poet(name)
    db.session.add(poet)
    db.session.commit()
    return poet

def get_or_create_poet(name):
    poet = Poet.query.filter(Poet.name == name).first()
    if poet:
        return poet
    return create_poet(name)

class Poem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    creation_time = db.Column(db.DateTime)
    pushed_to_wit = db.Column(db.Boolean)
    title = db.Column(db.Text())
    text = db.Column(db.Text())
    youtube = db.Column(db.Text()) # youtube url
    audio = db.Column(db.Text()) # audio url
    poet_id = db.Column(db.Integer, db.ForeignKey('poet.id'))

    def __init__(self, title, text, youtube, audio):
        self.title = title
        self.text = text
        self.youtube = youtube
        self.audio = audio
        self.creation_time = utility.get_time()
        self.pushed_to_wit = False

    def set_youtube(self, youtube):
        self.youtube = youtube
        db.session.commit()

    def get_title(self):
        return self.title.title()

    def wit_entity_id(self):
        return 'poem_name'

    def display_self(self):
        return {'text':format_to_css(self.text), 'title':self.get_title(), 'youtube':self.youtube, 'audio':self.audio, 'poet':Poet.query.get(self.poet_id).get_name()}

def create_poem(title, text, youtube, audio, poet_id):
    poet = Poet.query.get(poet_id)
    if not poet:
        print "No Poet"
        return
    poem = Poem(title, text, youtube, audio)
    poet.poems.append(poem)
    db.session.add(poem)
    db.session.commit()
    return poem

def format_to_css(text):
    parts = [p for p in text.strip('\n').split('\n')]
    for num,p in enumerate(parts):
        if p == '':
            continue
        k = 0
        while p[k] == ' ':
            k += 1
            if k > 0:
                parts[num] = p.replace(p[:k], '&nbsp;'*k)
    return '<p>' + '</p><p>'.join(parts) + '</p>'
