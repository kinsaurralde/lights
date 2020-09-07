# ws281x-led

## Table of Contents
1. [Top Level Directory Structure](#top-level-directory-structure)
2. [Installation](#installation)
3. [Building](#building)
4. [Testing](#testing)
5. [Tools](#tools)
6. [Application Architecture](#application-architecture)
7. [TODO](#todo)

## Top Level Directory Structure
```
.
├── build
├── docs                # Documentation files
├── images              # Images used for README or other docs
├── lint_config         # Configuration for linters
├── src                 # Source files
├── tools               # Programs used to copy, send, or test
├── .gitignore
├── Makefile
├── LICENSE
└── README.md
```

## Installation
1. Install python3 and make if not already installed

2. Clone this repository using
```bash
git clone https://github.com/kinsaurralde/ws_281x-lights
```

3. Run
```bash
make setup
```
to install dependencies

## Building
Running
```bash
make
```
will copy files to the build directory.
The subdirectories of the build directory can be copied or sent to the devices they will actually run on.

```
.
├── ...
├── build
│   ├── esp8266             # Webserver for esp8266 and source files for pixels shared object
│   ├── raspberrypi         # Flask Webserver for raspberry pi and source files for pixels shared object
│   └── webapp              # Flask Webserver for webapp
└── ...
```

The esp8266 directory can be directly uploaded to an esp8266 connected over serial.
It is easiest to do this in the Arduino IDE as its library manager is needed to download libraries.
The files in this directory are only intended for an esp8266.


The raspberrypi directory can be put on a raspberry pi by manually copying or by using the upload_rpi tool.
Once on the raspberry pi, it can be build by running `make setup` if necessary then `make`.
The files in this directory are only intended for a raspberry pi.

The webapp directory can be run on any device that has python since it does not interact with special hardware that the esp8266 and raspberry pi use.

## Testing

## Tools

## Application Architecture
![Application Architecture](images/application_architecture.png)

## Todo
- Controller brightness
- Power consumption measurement and adjustment
- Webpage hide/add/remove colors slots
- SocketIO
    - Controller ping on webpage
    - Controller brighntess on webpage
    - Controller connected on webpage
    - Webapp expected pixel colors
- Add webapp to upload_rpi.py
- Hide/Show sections on webpage
- Tests for controllers
- Verion numbers
- Update README
