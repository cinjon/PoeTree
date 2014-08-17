from flask import Flask, request, Response
from flask import render_template, send_from_directory, url_for
from flask.ext.sqlalchemy import SQLAlchemy
import utility
import config

basedir = config.basedir
audiodir = '/data/audio'
wit_access_token = config.WIT_ACCESS_TOKEN

flask_app = Flask(__name__, template_folder='public/template')
flask_app.config.from_object('config')
db = SQLAlchemy(flask_app)

import logging
from logging import StreamHandler
file_handler = StreamHandler()
flask_app.logger.setLevel(logging.DEBUG)  # set the desired logging level here
flask_app.logger.addHandler(file_handler)

import models
import controllers
import scripts
