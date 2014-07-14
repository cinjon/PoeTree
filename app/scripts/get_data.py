import app
import bs4
import urllib2

def clean_identifier(id):
    #id is a soup find object. we want to yield and clean up the text
    return ' '.join([k for k in id.getText().strip().lower().split(' ') if k])

def get_poet(soup, ty):
    def get_div():
        if ty == 'foundation':
            return soup.find('div', {'id':'poemwrapper'}).find('span', {'class':'author'}).find('a')
        elif ty == 'hunter':
            return soup.find('div', {'class':'poet', 'itemprop':'author'})

    try:
        name = clean_identifier(get_div())
        if name:
            return app.models.get_or_create_poet(name)
        return None
    except Exception, e:
        return None

def get_audio(soup):
    try:
        audioplayer = soup.find('div', {'class':'audioplayer'}).find('script').getText()
        start = audioplayer.find('/audio/')
        if start < 0:
            return None
        end = audioplayer.find("\'})", 245)
        if end < 0:
            print 'No end, but there is a start: %s' % audioplayer
            return None
        return audioplayer[start:end]
    except Exception, e:
        return None

def get_title(soup, ty):
    def get_div():
        if ty == 'foundation':
            return soup.find('div', {'id':'poem-top'})
        elif ty == 'hunter':
            return soup.find('h2', {'class':'title', 'itemprop':'name'})

    try:
        return clean_identifier(get_div())
    except Exception, e:
        return None

def get_poem_text(soup, ty):
    def get_div():
        if ty == 'foundation':
            return soup.find('div', {'id':'poem'}).find('div', {'class':'poem'}).getText()
        elif ty == 'hunter':
            txt = soup.find('div', {'class':'KonaBody'}).find('p')
            rpltxt = ''
            for e in txt.recursiveChildGenerator():
                if isinstance(e, basestring):
                    rpltxt += e.strip()
                elif e.name == 'br':
                    rpltxt += '\n'
            return rpltxt.strip()
    try:
        return '\n'.join([l.replace(u'\xa0', ' ').replace(u'\2014', '--') for l in get_div().split('\n')])
    except Exception, e:
        return None

def make_poem(soup, audio, title, poet, ty):
    poem_text = get_poem_text(soup, ty)
    if not poem_text:
        print "No Poem text for %s with author %s" % (title, poet.name)
    app.models.create_poem(title, poem_text, None, audio, poet.id)

def has_poem(title, poet_id):
    return app.models.Poem.query.filter(app.models.Poem.title == title, app.models.Poem.poet_id==poet_id).count() > 0

def _get_poems(poems, ty):
    for url in urls:
        soup = bs4.BeautifulSoup(urllib2.urlopen(urllib2.Request(url)))
        poet = get_poet(soup, ty)
        if not poet:
            print "Continuing, no poet in %s" % url
            continue
        title = get_title(soup, ty)
        if has_poem(title, poet.id):
            print "Already have %s from %s" % (title, poet.name)
            continue
        audio = get_audio(soup)
        make_poem(soup, audio, title, poet, ty)
    app.db.session.commit()

def get_poems_from_foundation(poems):
    # poems is a list of poem ids, e.g. 173742 --> Ode on a Grecian Urn
    baseurl = 'http://www.poetryfoundation.org/poem/'
    urls = [baseurl + str(poem) for poem in poems]
    _get_poems(poems, 'foundation')

def get_poems_from_poemhunter(poems):
    # poems is a list of poem routes, e.g. d-jeuner-du-matin --> Dejeuner du matin
    baseurl = 'http://www.poemhunter.com/poem/'
    urls = [baseurl + str(poem) for poem in poems]
    _get_poems(poems, 'hunter')
