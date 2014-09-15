from flask import Flask, request, Response
from flask import render_template, send_from_directory, url_for
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.mobility import Mobility
from logging import StreamHandler, DEBUG
import utility
import config
import os

basedir = config.basedir
baseurl = config.baseurl
phenv = config.phenv
audiodir = '/data/audio'
if not os.path.exists(audiodir):
    audiodir = '/Users/cinjon/Desktop/code/poetry/app/static/audio'
wit_access_token = config.WIT_ACCESS_TOKEN

flask_app = Flask(__name__, template_folder='public/template')
flask_app.config.from_object('config')
db = SQLAlchemy(flask_app)
Mobility(flask_app)

file_handler = StreamHandler()
flask_app.logger.setLevel(DEBUG)  # set the desired logging level here
flask_app.logger.addHandler(file_handler)

import models
import controllers
import scripts
