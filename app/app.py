#!/usr/bin/env python3
import json
import sys
import time
import argparse

from flask import Flask, render_template, json, request, send_from_directory
from flask_socketio import SocketIO
from py.info import Info
from py.multicontroller import MultiController

try:
    import yaml # 3.6
except:
    import ruamel.yaml as yaml  # 3.7

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins = '*')

parser = argparse.ArgumentParser()
parser.add_argument('-d', '--debug', action='store_true', help='Debug mode', default=False)
parser.add_argument('-t', '--test', action='store_true', help='Testing mode (for non pi devices)', default=False)
parser.add_argument('-c', '--config', type=str, help='Path to main config file', default="configs/sample/main.yaml")
parser.add_argument('-p', '--port', type=int, help='Port to run server on (overrides config file)', default=None)
args = parser.parse_args()

def open_yaml(path):
    data = {}
    with open(path) as open_file:
        data = yaml.load(open_file)
    return data

def create_response(data):
    response = app.response_class(response=json.dumps(
        data), status=200, mimetype='application/json')
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

def error_response(message):
    data = {
        "error": True,
        "message": message,
    }
    return create_response(data)

@app.errorhandler(404)
def page_not_found(e):
    return error_response(str(e)), 404

@app.route('/')
def index():
    """Main control page"""
    return render_template('index.html', quick_actions=quick_actions, controllers=mc.info(), vcontrollers=mc.vinfo(), colors=default_colors)

@app.route('/info/<function>')
def info(function):
    if function == "web":
        return render_template('info.html', controllers=mc.info())
    elif function == "get":
        data = mc.info()
        return create_response(data)
    else:
        return page_not_found("Info function not found")

@app.route('/config/<function>')
def get_config(function):
    if function == "colors":
        return create_response(default_colors)
    elif function == "animations":
        return create_response(web_animations)
    return create_response({"colors": default_colors, "animations": web_animations})

@app.route('/ping')
def ping_http():
    data = mc.ping()
    return create_response(data)

@app.route('/action', methods=['POST'])
def action():
    data = request.get_json()
    mc.execute(data["actions"], data["options"])
    return create_response(None)

@app.route('/quickaction', methods=['POST'])
def quickaction():
    recieved = request.get_json(force=True)
    if recieved["name"] in quick_actions["actions"]:
        mc.execute(quick_actions["actions"][recieved["name"]]["actions"], recieved["options"])
    return create_response({"recieved": recieved})

@app.route('/shutdown')
def shutdown():
    socketio.server.stop()

@socketio.on('connect')
def connect():
    print("Client Connected:", request.remote_addr)
    socketio.emit('connection_response', room=request.sid)

@socketio.on('disconnect')
def disconnect():
    print('Client Disconnected')

@socketio.on('webping')
def ping_web():
    return

@socketio.on('info')
def socket_info():
    socketio.emit('brightness_change', mc.get_brightness())
    info.emit(request)

@socketio.on('info_wait')
def socket_info_wait(data):
    info.set_wait(data)

@socketio.on('set_brightness')
def set_brightness(data):
    result = mc.set_brightness(data)
    socketio.emit('brightness_change', result)

@socketio.on('action')
def socket_action(data):
    mc.execute(data["actions"], data["options"])

main_config = open_yaml(args.config)
web_config = main_config["config"]["web"]
config_paths = main_config["config"]["config_paths"]
controller_config = open_yaml(config_paths["controllers"])
quick_actions = open_yaml(config_paths["quick_actions"])
v_controller_config = open_yaml(config_paths["virtual_controllers"])
default_colors = open_yaml(config_paths["colors"])
web_animations = open_yaml(config_paths["animations"])

mc = MultiController(testing=args.test, config=controller_config["config"], virtual_controller_config=v_controller_config["config"])
info = Info(socketio, mc)

port = 200
if "port" in web_config:
    port = int(web_config["port"])
if args.port is not None:
    port = args.port

if __name__ == '__main__':
    socketio.run(app, debug = args.debug, host = '0.0.0.0', port = port, use_reloader = False) 