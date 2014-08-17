from app import db
from app import utility
import random
import os

class Audio(db.Model):
    # Poems have audio files. These are UGC.
    id = db.Column(db.Integer, primary_key=True)
    poem_id = db.Column(db.Integer, db.ForeignKey('poem.id'))
    filename = db.Column(db.Text())
    creation_time = db.Column(db.DateTime)
    youtube = db.Column(db.Text()) #in case we decide to upload to youtube

    def __init__(self, poem_title, filename=None):
        self.filename = filename or get_next_audio(poem_title)
        self.creation_time = utility.get_time()
        self.youtube = None

def create_audio(poem_id, filename=None):
    poem = Poem.query.get(poem_id)
    if not poem:
        return
    audio = Audio(poem.title, filename)
    poem.audios.append(audio)
    db.session.add(audio)
    db.session.commit()
    return audio

def get_next_audio(title):
    filename = utility.dashify(title)
    filename_count = Audio.query.filter(Audio.filename == filename).count()
    if filename_count > 0:
        filename += '-' + str(filename_count)
    return filename

class Poet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text())
    poems = db.relationship('Poem', lazy='dynamic', backref='poet')
    creation_time = db.Column(db.DateTime)

    def __init__(self, name):
        self.name = name
        self.creation_time = utility.get_time()

    def get_name(self):
        return self.name.title()

    def check_match(self, query):
        return check_match(self.name, query)

    def display(self):
        return {'type':'poet', 'name':self.get_name(), 'poems':self.display_poems()}

    def display_poems(self):
        return [poem.display() for poem in self.poems.all()]

class Poem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    creation_time = db.Column(db.DateTime)
    title = db.Column(db.Text())
    text = db.Column(db.Text())
    poet_id = db.Column(db.Integer, db.ForeignKey('poet.id'))
    audios = db.relationship('Audio', lazy='dynamic', backref='poem')

    def __init__(self, title, text):
        self.title = title
        self.text = text
        self.creation_time = utility.get_time()

    def get_title(self):
        return self.title.title()

    def check_match(self, query):
        return check_match(self.title, query)

    def get_audio_src(self):
        if self.audios.count() == 0:
            return None
        audio = random.choice(self.audios.all()) #Pick a random audio from this poem
        filename = 'audio/poems-set/' + audio.filename
        if os.path.exists(filename + '.m4a'):
            return filename + '.m4a'
        return filename + '.wav'

    def display(self):
        return {'text':format_to_css(self.text), 'title':self.get_title(),
                'next_audio':get_next_audio(self.title), 'audio':self.get_audio_src(),
                'poet':Poet.query.get(self.poet_id).get_name(), 'type':'poem'}

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

def create_poem(title, text, poet_id):
    poet = Poet.query.get(poet_id)
    if not poet:
        return
    poem = Poem(title, text)
    poet.poems.append(poem)
    db.session.add(poem)
    db.session.commit()
    return poem

def format_to_css(text):
    parts = [p.strip() for p in text.strip('\n').split('\n')]
    for num,p in enumerate(parts):
        if p == '':
            continue
        k = 0
        while p[k] == ' ':
            k += 1
            if k > 0:
                parts[num] = p.replace(p[:k], '&nbsp;'*k)
    return '<p>' + '</p><p>'.join(parts) + '</p>'

def check_match(phrase, query):
    # Check to see if query matches phrase in some way, e.g.
    # query="john" matches on phrase={"john keats", "mr john", "john goes to washington"}
    # query="john doe" matches on phrase="john keats" with low score and "john do" with higher score
    if query in phrase:
        return 1.0*len(query)/len(phrase)
    numchars = sum([len(i) for i in set(query.split(' ')) if len(i) > 2 and i in phrase]) #made it a set so that something with repeated terms like "the" doesn't get abused. should do something smarter... like a real search algo
    return 1.0*numchars/len(query)
