from app import db
from app import utility

class Poet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text())
    poems = db.relationship('Poem', lazy='dynamic', backref='poet')
    creation_time = db.Column(db.DateTime)

    def __init__(self, name):
        self.name = name
        self.creation_time = utility.get_time()

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

    def set_youtube(self, youtube):
        self.youtube = youtube
        db.session.commit()

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
