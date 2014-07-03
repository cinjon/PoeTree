import app
import datetime
import random
import string
from flask import jsonify, Response

########
# Time Helpers
########

start_date = datetime.datetime(year=1970,month=1,day=1)

def get_time():
    return datetime.datetime.utcnow()

def get_unixtime(_datetime=None):
    if _datetime:
        return (_datetime - start_date).total_seconds()
    return (datetime.datetime.utcnow() - start_date).total_seconds()


########
# Hash Helpers
########

def generate_hash(word):
    return generate_password_hash(word)

def check_hash(stored, request):
    return check_password_hash(stored, request)

def generate_id(size=12):
    return ''.join(random.choice(string.ascii_uppercase + string.digits) for x in range(size))

########
# XHR Responses
########

def xhr_response(data, code):
    response = jsonify(data)
    response.status_code = code
    return response
