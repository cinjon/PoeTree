import os
CSRF_ENABLED = True
SECRET_KEY = os.environ.get('POETREE_SECRET_KEY')
basedir = os.path.abspath(os.path.dirname(__file__))
DEBUG = True
SQLALCHEMY_DATABASE_URI = os.environ.get('POETREE_DATABASE_URL', None)
WIT_ACCESS_TOKEN = os.environ.get('WIT_ACCESS_TOKEN', None)
