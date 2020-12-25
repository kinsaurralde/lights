# Version Information
MAJOR				= 2
MINOR				= 3
PATCH				= 0
LABEL				= simulate

# Paths

SRC_DIR				= src/
BUILD_DIR			= build/
TOOLS_DIR			= tools/
CONTROLLERS_DIR  	= src/controller/
SCRIPTS_DIR			= src/scripts/
WEBAPP_DIR			= src/webapp/
CPP_FLAGS			= -Wno-undef -Wall -Werror

BUILD_RPI_DIR		= ${BUILD_DIR}raspberrypi/
BUILD_RPI_SRC_DIR	= ${BUILD_RPI_DIR}src/
BUILD_ESP8266_DIR	= ${BUILD_DIR}esp8266/controller/

HTML_DIR			= ${WEBAPP_DIR}templates/
CSS_DIR 			= ${WEBAPP_DIR}static/css/
JS_FILES			= ${WEBAPP_DIR}static/*.js ${WEBAPP_DIR}static/main/*.js
PY_FILES			= ${WEBAPP_DIR}*.py ${WEBAPP_DIR}tests/*.py ${WEBAPP_DIR}modules/*.py tools/*

# Lint commands

CLANG_FORMAT		= node_modules/clang-format/bin/linux_x64/clang-format --style=Google
ESLINT				= node_modules/eslint/bin/eslint.js
HTML_VALIDATE		= node_modules/html-validate/bin/html-validate.js
PRETTIER			= node_modules/prettier/bin-prettier.js
UGLIFYJS			= node_modules/uglify-js/bin/uglifyjs
PRETTIER_CONIG		= --config lint_config/.prettierrc.json
HTML_VALIDATE_CONFG = --config lint_config/.htmlvalidate.json
ESLINT_CONFIG		= --config lint_config/.eslintrc.json
PYLINT_CONFIG		= --rcfile=lint_config/pylintrc

WEBAPP_CONFIG_ARG	= "config/controllers_sample.yaml"

ESP_HASH			= $(shell sha1sum ${CONTROLLERS_DIR}controller.ino ${CONTROLLERS_DIR}pixels* ${CONTROLLERS_DIR}structs* | sha1sum | head -c 40)
RPI_HASH			= $(shell sha1sum ${CONTROLLERS_DIR}*.py ${CONTROLLERS_DIR}pixels* ${CONTROLLERS_DIR}structs* | sha1sum | head -c 40)

WASM_ARGS			= -Os -s ASSERTIONS=1 -s LLD_REPORT_UNDEFINED --no-entry

WASM_LIST			= '_maxLEDPerStrip', '_ledStripCount', '_List_new', '_List_setCounter', '_List_getCounter', '_List_set', '_List_get', '_List_size'
WASM_PIXELS			= '_Pixels_new', '_Pixels_size', '_Pixels_getBrightness', '_Pixels_setBrightness', '_Pixels_get', '_Pixels_increment', '_Pixels_animation', '_createAnimationArgs'

WASM_EXPORTED		= -s "EXPORTED_FUNCTIONS=[${WASM_LIST}, ${WASM_PIXELS}]" -s "EXTRA_EXPORTED_RUNTIME_METHODS=['getValue']"

all:
	# Create Directories
	mkdir -p ${BUILD_ESP8266_DIR}
	mkdir -p ${BUILD_DIR}raspberrypi/src
	mkdir -p ${BUILD_DIR}webapp

	# Create Version
	touch ${BUILD_ESP8266_DIR}version.h
	printf "// This file is generated by 'make build' and should not be edited\n\n" > ${BUILD_ESP8266_DIR}version.h
	printf "#define MAJOR ${MAJOR}\n#define MINOR ${MINOR}\n#define PATCH ${PATCH}\n#define LABEL \"${LABEL}\"\n\n" >> ${BUILD_ESP8266_DIR}version.h
	printf "#define ESP_HASH \"${ESP_HASH}\"\n#define RPI_HASH \"${RPI_HASH}\"\n" >> ${BUILD_ESP8266_DIR}version.h
	cp ${BUILD_ESP8266_DIR}version.h ${BUILD_DIR}raspberrypi/src/version.h
	cp ${BUILD_ESP8266_DIR}version.h ${CONTROLLERS_DIR}version.h
	touch ${BUILD_DIR}raspberrypi/version.py
	printf "# This file is generated by 'make build' and should not be edited\n\n" > ${BUILD_DIR}raspberrypi/version.py
	printf "MAJOR = ${MAJOR}\nMINOR = ${MINOR}\nPATCH = ${PATCH}\nLABEL = \"${LABEL}\"\n\n" >> ${BUILD_DIR}raspberrypi/version.py
	printf "ESP_HASH = \"${ESP_HASH}\"\nRPI_HASH = \"${RPI_HASH}\"\n" >> ${BUILD_DIR}raspberrypi/version.py
	cp ${BUILD_DIR}raspberrypi/version.py ${WEBAPP_DIR}/version.py

	# Copy to raspberrypi
	cp ${CONTROLLERS_DIR}pixels.cpp ${CONTROLLERS_DIR}pixels.h -t ${BUILD_DIR}raspberrypi/src/
	cp ${CONTROLLERS_DIR}structs.cpp ${CONTROLLERS_DIR}structs.h -t ${BUILD_DIR}raspberrypi/src/
	cp ${CONTROLLERS_DIR}extern.cpp -t ${BUILD_DIR}raspberrypi/src/
	cp ${CONTROLLERS_DIR}wrapper.py ${CONTROLLERS_DIR}controller_server.py ${CONTROLLERS_DIR}controller.py ${BUILD_DIR}raspberrypi/
	cp ${SCRIPTS_DIR}rpi_startup.sh ${BUILD_DIR}raspberrypi/
	cp makefiles/rpi_Makefile ${BUILD_DIR}raspberrypi/Makefile

	# Copy to esp8266
	cp ${CONTROLLERS_DIR}pixels.cpp ${CONTROLLERS_DIR}pixels.h -t ${BUILD_ESP8266_DIR}
	cp ${CONTROLLERS_DIR}structs.cpp ${CONTROLLERS_DIR}structs.h -t ${BUILD_ESP8266_DIR}
	cp ${CONTROLLERS_DIR}controller.ino ${BUILD_ESP8266_DIR}
	touch ${BUILD_ESP8266_DIR}wifi_credentials.h
	printf "#define WIFI_SSID \"ssid\"\n#define WIFI_PASSWORD \"password\"\n" > ${BUILD_ESP8266_DIR}wifi_credentials.h

	g++ -c -fPIC ${BUILD_RPI_SRC_DIR}pixels.cpp -o ${BUILD_RPI_SRC_DIR}pixels.o ${CPP_FLAGS}
	g++ -c -fPIC ${BUILD_RPI_SRC_DIR}structs.cpp -o ${BUILD_RPI_SRC_DIR}structs.o ${CPP_FLAGS}
	g++ -c -fPIC ${BUILD_RPI_SRC_DIR}extern.cpp -o ${BUILD_RPI_SRC_DIR}extern.o ${CPP_FLAGS}
	g++ -shared -o ${BUILD_RPI_DIR}pixels.so ${BUILD_RPI_SRC_DIR}pixels.o ${BUILD_RPI_SRC_DIR}structs.o ${BUILD_RPI_SRC_DIR}extern.o ${CPP_FLAGS}
	rm -f ${BUILD_RPI_SRC_DIR}*.o

	# Copy to webapp
	cp -r ${WEBAPP_DIR} ${BUILD_DIR}

test:
	make coverage

test_webapp:
	cd src/webapp && python3 -m pytest && cd ../../

coverage:
	cd src/webapp && coverage run --source=. --omit="*/tests*,*/sequences*,version.py,conftest.py" -m pytest && coverage report && coverage html && cd ../../

run_rpi: build
	cd ${BUILD_RPI_DIR} && python3 controller_server.py --test && cd ../../

run_app:
	cd ${WEBAPP_DIR} && python3 app.py -d --config ${WEBAPP_CONFIG_ARG}

run_app_nosend:
	cd ${WEBAPP_DIR} && python3 app.py -d --nosend --config ${WEBAPP_CONFIG_ARG}

run_local: all
	cd ${TOOLS_DIR} && sudo python3 -i localtest.py

setup:
	sudo apt update --fix-missing
	sudo apt install nodejs
	sudo apt install npm
	make node_modules
	sudo npm i docsify-cli -g
	sudo apt install pylint
	sudo apt install python3-pip
	pip3 install eventlet
	pip3 install setuptools
	pip3 install black
	pip3 install pytest-flask
	pip3 install pytest-mock
	pip3 install coverage
	pip3 install pylint
	pip3 install schedule
	sudo pip3 install schedule
	sudo pip3 install rpi_ws281x
	sudo apt install screen
	sudo pip3 install Flask
	sudo pip3 install flask_socketio
	sudo pip3 install ruamel.yaml 

node_modules:
	npm install clang-format prettier html-validate eslint eslint-config-defaults eslint-config-google uglify-js

lint: all clean
	${PRETTIER} ${PRETTIER_CONIG} --write ${CSS_DIR}*.css
	${PRETTIER} ${PRETTIER_CONIG} --write ${HTML_DIR}*.html
	find src/ -iname *.js | xargs ${CLANG_FORMAT} -i
	${UGLIFYJS} ${WEBAPP_DIR}static/pixels/pixels.js --compress > ${BUILD_DIR}a.tmp
	${UGLIFYJS} ${WEBAPP_DIR}static/lib/socket.io.js --compress > ${BUILD_DIR}b.tmp
	mv ${BUILD_DIR}a.tmp ${WEBAPP_DIR}static/pixels/pixels.js
	mv ${BUILD_DIR}b.tmp ${WEBAPP_DIR}static/lib/socket.io.js
	${HTML_VALIDATE} ${HTML_VALIDATE_CONFG} ${HTML_DIR}*.html
	${ESLINT} --fix ${ESLINT_CONFIG} ${JS_FILES}
	python3 -m black ${PY_FILES}
	python3 -m pylint ${PYLINT_CONFIG} ${PY_FILES}

lol:
	${UGLIFYJS} ${WEBAPP_DIR}static/pixels/pixels.js --compress > a.tmp
	${UGLIFYJS} ${WEBAPP_DIR}static/lib/socket.io.js --compress > b.tmp

upload_rpi: all
	cd tools &&	python3 upload_rpi.py

.PHONY: docs
docs:
	cp -r images/ docs/images
	cp README.md docs/README.md
	docsify serve docs

git:
	make clean
	make test
	make lint
	git status

clean:
	rm -fr ${BUILD_DIR}*
	rm -f ${CONTROLLERS_DIR}*.so
	rm -f ${WEBAPP_DIR}controller.py
	rm -f ${WEBAPP_DIR}wrapper.py
	find . -name __pycache__ -exec rm -rv {} +
	find . -name .pytest_cache -exec rm -rv {} +
	find . -name htmlcov -exec rm -rv {} +
	find . -name .coverage -exec rm -rv {} +
	
wasm:
	./sdk/emsdk/emsdk activate > /dev/null
	echo "If em++: not found, run"
	echo "cd sdk/emsdk/ && source ./emsdk_env.sh"
	em++ ${WASM_ARGS} ${WASM_EXPORTED} -o ${WEBAPP_DIR}static/pixels/pixels.js ${CONTROLLERS_DIR}extern.cpp ${CONTROLLERS_DIR}structs.cpp ${CONTROLLERS_DIR}pixels.cpp

wasm-optimized:
	em++ ${WASM_ARGS} -O3 ${WASM_EXPORTED} -o ${WEBAPP_DIR}static/pixels/pixels.js ${CONTROLLERS_DIR}extern.cpp ${CONTROLLERS_DIR}structs.cpp ${CONTROLLERS_DIR}pixels.cpp