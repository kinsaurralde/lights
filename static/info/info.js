class Info {
    constructor(controller_div_id, table_div = null) {
        this.table_div = table_div;
        this.table = table_div;
        this.has_table = false;
        if (this.table != null) {
            this.table = document.getElementById(this.table);
            this.has_table = true;
        }
        this.display = new Display(controller_div_id);
        this.display.setup(init_data());
        this.url = "http://" + location.host;
        this.s = io();
        this.r = new Array();
        this.update = true;
        this.ping_data = new Array();
        this.num_controllers = 1;

        let self = this;
        this.s.on('connection_response', function() {
            console.log("Now Connected");
            self.refresh();
        });
        this.s.on('info_response', function(data) {
            self._updateDisplay(data);
        });
        this.s.on('info_renew', function() {
            console.debug("Renew Info");
            self.refresh();
        });
        this.s.on('controller_urls', function(data) {
            console.debug("Recieved controller URLS:", data);
            self._addControllers(data);
        });

        this.refresh();
    }

    _addControllers(data) {
        this.r = new Array(0);
        for (let i = 0; i < data.length; i++) {
            let url = data[i]["url"];
            if (url == null) {
                continue;
            }
            this.r.push({
                "io": io(data[i]["url"]),
                "ping_start_time": 0
            });
            let self = this;
            let index = this.r.length - 1;
            this.r[index]["io"].on('info_response', function(data) {
                self._updateDisplay(data);
            });
            this.r[index]["io"].on('info_renew', function() {
                self.refresh();
            });
        }
    }

    _updateDisplay(data) {
        if (this.update) {
            this.display.set(data)
        }
    }

    _clearTable() {
        let table_size = this.table.rows.length;
        for (let i = 1; i < table_size; i++) {
            this.table.deleteRow(1);
        }
    }

    _appendRow(data) {
        let row = this.table.insertRow();
        let self = this;
        for (let j = 0; j < 11; j++) {
            row.insertCell();
        }
        if (data["error"] == false) {
            this.table.rows[this.table.rows.length - 1].cells[1].innerHTML = data["power"]["now_watts"].toFixed(3) + " / " + data["power"]["strip_max"];
            this.table.rows[this.table.rows.length - 1].cells[2].innerHTML = data["power"]["max_watts"];
            this.table.rows[this.table.rows.length - 1].cells[3].innerHTML = data["settings"]["brightness"];
            this.table.rows[this.table.rows.length - 1].cells[4].innerHTML = data["settings"]["num_pixels"];
            this.table.rows[this.table.rows.length - 1].cells[5].innerHTML = data["strip_info"].length;
            this.table.rows[this.table.rows.length - 1].cells[6].innerHTML = data["ping"].toFixed(3);
        } else {
            for (let i = 0; i < this.table.rows[this.table.rows.length - 1].cells.length - 2; i++) {
                this.table.rows[this.table.rows.length - 1].cells[i].innerHTML = " --- ";
            }
        }
        this.table.rows[this.table.rows.length - 1].cells[0].innerHTML = data["controller_id"];
        this.table.rows[this.table.rows.length - 1].cells[8].innerHTML = data["enabled"][0] + " / " + data["enabled"][1];
        this.table.rows[this.table.rows.length - 1].cells[9].appendChild(w.createButton("Enable", null, function() {
            self.toggleEnable(true, data["controller_id"]);
        }));
        this.table.rows[this.table.rows.length - 1].cells[10].appendChild(w.createButton("Disable", null, function() {
            self.toggleEnable(false, data["controller_id"]);
        }));
    }

    _updateTable(data) {
        if (this.has_table) {
            this._clearTable();
            this.num_controllers = data.length;
            for (let i = 0; i < data.length; i++) {
                this._appendRow(data[i]);
            }
        }
    }

    _send(path) {
        let request = new XMLHttpRequest();
        let self = this;
        request.open('GET', path, true);
        request.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                let data = JSON.parse(this.response);
                console.debug("Recieved Data:", data);
                self._updateTable(data);
            } else {
                console.log("There was an error");
            }
        };
        request.onerror = function () {
            console.log("Connection Error: ", this.status, request);
        };
        request.send();
    }

    _ping_send() {
        this.ping_data = Array(this.num_controllers);
        this.ping_data.fill(Date.now());
        let start_time = Date.now();
        let self = this;
        this.s.emit('ping1', function(data) {
            self._ping_recieve(data, start_time, Date.now());
        });
        for (let i = 0; i < this.r.length; i++) {
            start_time = Date.now();
            this.r[i]["io"].emit('ping1', function(data) {
                self._ping_recieve(data, start_time, Date.now());
            });
        }
    }

    _ping_recieve(data, start_time, end_time) {
        for (let i = 0; i < data.length; i++) {
            let id = data[i]["controller_id"];
            this.table.rows[id + 1].cells[7].innerText = end_time - start_time;
        }
    }

    refresh() {
        if (this.update) {
            this._send("/info/get");
            this.s.emit('info');
            for (let i = 0; i < this.r.length; i++) {
                this.r[i]["io"].emit('info');
            }
        }
        this._ping_send();
    }

    toggleUpdate(div_id) {
        this.update = document.getElementById(div_id).checked;
        if (this.update) {
            this.refresh();
        }
    }

    toggleEnable(enable, controller_id) {
        let key = document.getElementById(this.table_div + "-webkey").value;
        if (key.length == 0) {
            return
        }
        if (enable) {
            this._send("/" + key + "/controllers/enable/" + controller_id);
        } else {
            this._send("/" + key + "/controllers/disable/" + controller_id);
        }
    }

    setUpdate(val) {
        this.update = val;
    }
};


function init_data(r = 0, g = 0, b = 0) {
    let data = {
        "controller_id": 0,
        "strip_info": [
            {"id": 0, "start": 0, "end": 59},
            {"id": 1, "start": 0, "end": 29},
            {"id": 2, "start": 30, "end": 59},
        ],
        "pixels": new Array(60)
    };
    for (let i = 0; i < 60; i++) {
        data["pixels"][i] = {"r": 0, "g": 0, "b": 0};
    }
    console.log(data)
    return data
}