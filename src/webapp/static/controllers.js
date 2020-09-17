/* exported Controllers */
/* globals socket */

const TABLE_COLUMNS = 7;
const STATUS_COLUMNS = 5;

const GOOD = 'GOOD';
const WARNING = 'WARNING';
const ERROR = 'ERROR';
const FALSE = 'FALSE';
const TRUE = 'TRUE';
const PLAIN = 'PLAIN';
const UNKNOWN = 'UNKNOWN';

class Controllers {
  constructor() {
    socket.on('update', (data) => {
      console.debug(data);
      if ('ping' in data) {
        this.updatePing(data.ping);
      }
      if ('initialized' in data) {
        this.handleInitialzedResponse(data['initialized']);
      }
      if ('version' in data) {
        this.handleVersionInfoResponse(data['version']);
      }
    });
    const table = document.getElementById('controller-table');
    const status_table = document.getElementById('status-table');
    this.table = table.getElementsByTagName('tbody')[0];
    this.status_table = status_table.getElementsByTagName('tbody')[0];
    this.status = {};
    this.num_controllers = 0;
    this.num_strips = 0;
    this.controllers = {};
    this.brightness_link = [];
    this.fetchControllers();
    this.fetchInitialized();
    this.fetchVersionInfo();
  }

  fetchControllers() {
    fetch('/getcontrollers')
        .then((response) => response.json())
        .then((controllers) => {
          console.log('Recieved Controllers', controllers);
          this.controllers = controllers;
          this.num_controllers = Object.keys(this.controllers).length;
          for (let i = 0; i < this.num_controllers; i++) {
            this.addRow(this.controllers[Object.keys(this.controllers)[i]]);
          }
          loadedControllers();
        });
  }

  fetchInitialized() {
    fetch('/getinitialized')
        .then((response) => response.json())
        .then((initialized) => {
          console.log('Recieved Initialized', initialized);
          this.handleInitialzedResponse(initialized);
        });
  }

  handleInitialzedResponse(initialized) {
    for (const name in initialized.initialized) {
      if (name in initialized.initialized) {
        this.setStatusInitialized(
            name, initialized.initialized[name] ? TRUE : FALSE);
      }
    }
  }

  fetchVersionInfo() {
    fetch('/getversioninfo')
        .then((response) => response.json())
        .then((version_info) => {
          console.log('Recieved Version Info', version_info);
          this.handleVersionInfoResponse(version_info);
        });
  }

  handleVersionInfoResponse(version_info) {
    const major = version_info.webapp.major;
    const minor = version_info.webapp.minor;
    const patch = version_info.webapp.patch;
    const version = `${major}.${minor}.${patch}`;
    const esp_hash = version_info.webapp.esp_hash;
    const rpi_hash = version_info.webapp.rpi_hash;
    document.getElementById('status-webapp-version').textContent = version;
    document.getElementById('status-webapp-esphash').textContent = esp_hash;
    document.getElementById('status-webapp-rpihash').textContent = rpi_hash;
    for (const controller in version_info.versioninfo) {
      if (controller in version_info.versioninfo) {
        const data = version_info.versioninfo[controller];
        const version_string = `${data.major}.${data.minor}.${data.patch}`;
        const version_match = (major === data.major && minor === data.minor);
        const full_version_match = (version_match && patch === data.patch);
        const status =
            full_version_match ? GOOD : version_match ? WARNING : ERROR;
        this.setStatusVersion(controller, status, version_string);
        const hash_match =
            esp_hash === data.esp_hash && rpi_hash === data.rpi_hash;
        this.setStatusHashMatch(controller, hash_match ? TRUE : FALSE);
      }
    }
  }

  updatePing(data) {
    for (const controller in data) {
      if (controller in data) {
        const div =
            document.getElementById(`controllers-table-${controller}-ping`);
        if (data[controller] === null) {
          this.setStatus(div, FALSE, 'DISCONNECTED');
          this.setStatusConnected(controller, FALSE, 'DISCONNECTED');
        } else {
          this.setStatus(div, PLAIN, data[controller].toFixed(3));
          this.setStatusConnected(controller, TRUE);
        }
      }
    }
  }

  setStatus(div, type, text = null) {
    div.classList.remove(...div.classList);
    div.classList.add('section-title-secondary');
    if (text === null) {
      div.textContent = type;
    } else {
      div.textContent = text;
    }
    if (type === WARNING) {
      div.classList.add('yellow');
    } else if (type === GOOD || type === TRUE) {
      div.classList.add('green');
    } else if (type === PLAIN) {
      div.classList.add('white');
    } else {
      div.classList.add('red');
    }
  }

  setStatusInitialized(name, value) {
    this.status[name].initialized = value;
    const div = document.getElementById(`status-table-${name}-initialized`);
    this.setStatus(div, value);
  }

  setStatusVersion(name, value, text) {
    this.status[name].version = value;
    const div = document.getElementById(`status-table-${name}-version`);
    this.setStatus(div, value, text);
  }

  setStatusHashMatch(name, value) {
    this.status[name].hash_match = value;
    const div = document.getElementById(`status-table-${name}-hashmatch`);
    this.setStatus(div, value);
    this.setOverallStatus(name);
  }

  setStatusConnected(name, value, text) {
    this.status[name].connected = value;
    const div = document.getElementById(`status-table-${name}-connected`);
    this.setStatus(div, value, text);
    this.setOverallStatus(name);
  }

  setOverallStatus(name) {
    let good = true;
    let warn = false;
    if (this.status[name].initialized === FALSE) {
      good = false;
    }
    if (this.status[name].version === ERROR) {
      good = false;
    }
    if (this.status[name].version === WARNING) {
      good = false;
      warn = true;
    }
    if (this.status[name].hash_match === FALSE) {
      good = false;
      warn = true;
    }
    if (this.status[name].connected === FALSE) {
      good = false;
    }
    const div = document.getElementById(`controllers-table-${name}-status`);
    this.setStatus(div, good ? GOOD : warn ? WARNING : ERROR);
  }

  getNames() {
    return Object.keys(this.controllers);
  }

  setBrightness(name, value) {
    const id = `controllers-table-${name}-brightness-`;
    if (document.getElementById(id + 'slider') != null) {
      document.getElementById(id + 'slider').value = value;
      document.getElementById(id + 'value').textContent = value;
    }
  }

  sendBrightness(name, value, index) {
    if (this.brightness_link[index].checked) {
      const values = [];
      for (let i = 0; i < this.brightness_link.length; i++) {
        if (this.brightness_link[i].checked) {
          values.push({
            'name': this.brightness_link[i].name,
            'value': value,
          });
          this.brightness_link[i].slider.value = value;
          this.brightness_link[i].text.textContent = value;
        }
      }
      socket.emit('set_brightness', values);
    } else {
      socket.emit('set_brightness', [{'name': name, 'value': value}]);
    }
  }

  addRow(controller) {
    console.log('Adding controller', controller);
    this.num_strips += 1;
    const id = 'controllers-table-' + controller.name;

    this.brightness_link.push(false);
    const box = createCheckBox(id + '-checkbox', false, null);

    const name = createSecondTitle(id + '-name', controller.name);
    const brightness_slider = createRange(
        id + '-brightness-slider', controller.init.brightness, 0, 255);
    const brightness_value = document.createElement('span');
    brightness_value.id = id + '-brightness-value';

    const ping = createSecondTitle(id + '-ping', '---');

    const status = document.createElement('div');
    status.id = id + '-status';
    this.setStatus(status, UNKNOWN);

    const index = this.num_strips - 1;
    box.addEventListener('input', () => {
      this.brightness_link[index] = {
        'checked': box.checked,
        'name': controller.name,
        'slider': brightness_slider,
        'text': brightness_value,
      };
    });
    brightness_slider.addEventListener('input', () => {
      brightness_value.textContent = brightness_slider.value;
      this.sendBrightness(controller.name, brightness_slider.value, index);
    });
    brightness_value.className = 'section-title-secondary';
    brightness_value.textContent = controller.init.brightness;

    const row = this.table.insertRow();
    const cells = [];
    for (let i = 0; i < TABLE_COLUMNS; i++) {
      cells.push(row.insertCell());
    }
    cells[0].appendChild(name);
    cells[1].appendChild(box);
    cells[1].appendChild(brightness_slider);
    cells[1].appendChild(brightness_value);
    cells[2].textContent = controller.init.num_leds;
    cells[3].textContent = controller.init.milliwatts;
    cells[4].textContent = this.num_strips - 1;
    cells[5].appendChild(ping);
    cells[6].appendChild(status);

    this.addStatusRow(controller.name);
  }

  addStatusRow(name) {
    this.status[name] = {
      'initialized': UNKNOWN,
      'version': UNKNOWN,
      'hash_match': UNKNOWN,
      'connected': FALSE,
    };
    const row = this.status_table.insertRow();
    const cells = [];
    for (let i = 0; i < STATUS_COLUMNS; i++) {
      cells.push(row.insertCell());
    }
    const id = 'status-table-' + name;
    const display_name = createSecondTitle(id + '-name', name);
    const initialized = document.createElement('div');
    const connected = document.createElement('div');
    const version = document.createElement('div');
    const hash_match = document.createElement('div');
    this.setStatus(initialized, UNKNOWN);
    this.setStatus(connected, UNKNOWN);
    this.setStatus(version, UNKNOWN);
    this.setStatus(hash_match, UNKNOWN);

    initialized.id = id + '-initialized';
    connected.id = id + '-connected';
    version.id = id + '-version';
    hash_match.id = id + '-hashmatch';

    cells[0].appendChild(display_name);
    cells[1].appendChild(initialized);
    cells[2].appendChild(connected);
    cells[3].appendChild(version);
    cells[4].appendChild(hash_match);
  }
}
