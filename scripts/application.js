function setHeight(volume) {
      var canvas = document.getElementById('myCanvas');
      var context = canvas.getContext('2d');

      var width = 200;
      var height = 300;
     
      if (volume < 0) volume =0;
      if (volume > 1000) volume = 1000;


      var ratio = volume / 1000;
      var str_ht = height * ratio;
      var offset=30;

      context.beginPath();

      context.clearRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = 'black';
      context.fill();

      context.textAlign = 'center';
      context.font = '12pt Calibri';
      context.fillText(volume+'л',offset+width/2, offset-5+height*(1-ratio));

      context.rect(offset+0, offset + height * (1 - ratio), width, str_ht);
      context.fillStyle = 'lightblue';
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = 'gray';
      context.stroke();

      context.beginPath();
      context.rect(offset, offset, width, height);
      context.stroke();



    }

var counter=-1;
var currentId=null;
var oldtick;


function updateValue(set,param,val) {
    v = $$(set).getValues();
    v[param]=val;
    $$(set).setValues(v)
}

var app = {

    data: {},
    queryRunning: false,
    graphdata: [],
  
    // start the application
    start: function (deviceHive, deviceId) {
        this.deviceHive = deviceHive;
        this.clearValues();
        // get device information
        var that = this;
        that.deviceId = deviceId
        this.deviceHive.getDevice(deviceId)
            .done(function (device) {
                that.device = device;
                that.updateDeviceInfo(device);
                that.getLedState(device);
                that.subscribeNotifications(device);
                that.bindLedControl();
                setHeight(0);
            })
            .fail(that.handleError);
        this.queryNotifications()
    },

    queryNotifications: function (equipment) {
        if (this.queryRunning) {
            console.log("another query running, wait please")
            return;
        }
        url = this.deviceHive.serviceUrl + '/device/' + this.deviceId + '/notification?take=100&notification=equipment&Order=DESC'
        console.log(url)
        this.queryRunning = true;
        this.graphdata = []
        jqXhr = $.ajax({
            url: url,
            dataType: "json",
            success: function (data) {
                _.each(data, function (incomingNotification) {
                    if (incomingNotification.parameters.id == equipment) {
                        tuple = {"time":incomingNotification.timestamp,'value':incomingNotification.parameters.value}
                        this.graphdata += tuple;
                    }
                });
                console.log(graphdata)
                $$("graph").add(graphdata)
            },
            complete: function () {
                this.queryRunning = false;
                console.log("completed")
            },
            
        });
    },

    decodeEquipment: function(equipment,data) {
        if (equipment == "LEVEL") {
            this.updateLevel(data.parameters.value/100);
        }
        if (equipment == "VOLUME_S") {
            this.updateVolume(data.parameters.value);
        }
        if (equipment == "TEMP") {
            this.updateTemp(data.parameters.value/10);
        }
        if (equipment == "COUNTER") {
            this.updateCounter(data.parameters.value/100);
        }
        if (equipment == "FROM_FULL") {
            this.updateFromFull(data.parameters.value/100);
        }
        if (equipment == "MONEY_IN") {
            this.updateMoneyAfterIncassation(data.parameters.value/10);
        }
        if (equipment == "LITER_INCASS") {
            this.updateLitersAfterIncassation(data.parameters.value/100);
        }
        if (equipment == "ERRORS") {
            this.updateErrors(data.parameters.value);
        }
        if (equipment == "FLAGS") {
            this.updateFlags(data.parameters.value);
        }
        if (equipment == "ADC_VOLTS") {
            this.updateVolts(data.parameters.value);
        }
    },

    // gets current led state
    getLedState: function (device) {
        var that = this;
        this.deviceHive.getEquipmentState(device.id)
            .done(function (data) {
                jQuery.each(data, function (index, equipment) {
                    that.decodeEquipment(equipment.id,equipment);
                });
            })
            .fail(that.handleError);
    },

    // subscribes to device notifications
    subscribeNotifications: function (device) {
        var that = this;
        this.deviceHive.channelStateChanged(function (data) {
            that.updateChannelState(data.newState);
        });
        this.deviceHive.notification(function () {
            that.handleNotification.apply(that, arguments);
        });
        this.deviceHive.openChannel()
            .done(function() { 
                that.deviceHive.subscribe(device.id);
                currentId = device.id;
                oldtick = 0;
                })
            .fail(that.handleError);
    },

    // handles incoming notification
    handleNotification: function (deviceId, notification) {

        if (deviceId != currentId) return;

        var date = new Date()
        var tick = date.getTime();
        var delta = tick - oldtick;

        $('.channel-state').text((delta)+'c.');


        oldtick = tick;

        if (notification.notification == "equipment") {
           
                this.decodeEquipment(notification.parameters.equipment,notification);

        } else 
        if (notification.notification == "logline") {
            $('#logbook').append(notification.parameters.line+'<br>')
            $('#logbook').scrollTop($('#logbook')[0].scrollHeight);
        }
        if (notification.notification == "eeblock") {

            $('#logbook').append(notification.parameters.adr+" : "+notification.parameters.value+'<br>')
            
        }
        
        else if (notification.notification == "$device-update") {
            if (notification.parameters.status) this.device.status = notification.parameters.status;
            if (notification.parameters.name) this.device.name = notification.parameters.name;
            this.updateDeviceInfo(this.device);
        }
    },

    // bind LED On/Off button click handler
    bindLedControl: function () {
        var that = this;
        $(".send").click(function() {
            console.log("reading...")
            that.deviceHive.sendCommand(that.device.id, "ReadEeprom", { adr:0x110 })
                .fail(that.handleError);
        });
    },

    // updates device information on the page
    updateDeviceInfo: function (device) {
        $(".device-name").text(device.name);
        $(".device-status").text(device.status);
    },

    // updates channel state
    updateChannelState: function (state) {
/*        if (state === DeviceHive.channelState.connected)
            $(".channel-state").text("Connected");
        if (state === DeviceHive.channelState.connecting)
            $(".channel-state").text("Connecting");
        if (state === DeviceHive.channelState.disconnected)
            $(".channel-state").text("Disconnected");*/
    },

    // updates LED state on the page
    updateLevel: function (state) {

        if (state >= 500) {
            
            updateValue("basicsets","level","<Ошибка/Ожидание>");
            return;
        }
        updateValue("basicsets","level",state+"м");
    },
    updateVolts: function (state) {
        updateValue("extendedsets","voltage",5*state/1024+"V");
    },

    updateVolume: function (value) {

        if (value>= 50000) {
            updateValue("basicsets","volume","<Ошибка/Ожидание>");
            return;
        }
        updateValue("basicsets","volume",value+"л");
        setHeight(value)
    },
    updateTemp: function (value) {
        updateValue("basicsets","temperature",value+'C');        
    },
    updateCounter: function (value) {
        this.counter = value;
        updateValue("basicsets","counter",value+'л'); 
    },
    updateFromFull: function (value) {
        var v = this.counter - value;
        updateValue("extendedsets","litersfromfull",v+'л'); 
        
    },
    updateLitersAfterIncassation: function(value) {
        updateValue("basicsets","inc_liters",value+'л'); 
    },
    updateMoneyAfterIncassation: function(value) {
        updateValue("basicsets","inc_hrn",value+"грн."); 
    },
    updateErrors: function(value) {

        var errortext = []
        errortext[0] = "Нет датчика температуры";
        errortext[1] = "Провод датчика температуры";
        errortext[2] = "CRC датчика температуры";
        errortext[3] = "Undefined error";
        errortext[4] = "Нет импульсов расхода";
        errortext[5] = "Купюроприемник помеха";
        errortext[6] = "Монетоприемник помеха";
        errortext[7] = "Датчик уровня низк";

       // $('.device-error-mask').text(value);
        $$('errorlist').clearAll();

        for (i=0;i<32;i++) {
            mask = (1<<i);
            if (value & mask) {
                $$('errorlist').add({"id":i,"error":errortext[i]});
            }
        }

        
    },

    updateFlags: function(value) {


    console.log('Flags='+value); 
    for (i=0;i<15;i++) {
            mask = (1<<i);
            checked =  value & mask;
            name = 'flag'+i;

            updateValue("extendedsets",name,checked); 
            //$(name).prop('checked',checked);
               
            
        }
          



    },

    clearValues: function() {
        $$('errorlist').clearAll();
        

        $$("basicsets").setValues({
            level:'Ожидание',
            volume:'Ожидание',
            temperature:'Ожидание',
            counter:'Ожидание',
            inc_liters:'Ожидание',
            inc_hrn:'Ожидание',
        })
        

        $(".device-temp").text('Ожидание')       
        $(".device-volume").text('Ожидание')
        $(".device-level").text('Ожидание')
        $(".device-counter").text('Ожидание')
        $(".device-liters-incass").text('Ожидание')
        $('.device-money-incass').text("Ожидание")
        $('.device-error-mask').text("Ожидание");
        setHeight(0)
    },


    formatDate: function(date) {
        var pad = function(d) { return d < 10 ? "0" + d : d; };
        return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
    },

    handleError: function (e, xhr) {
        alert(e);
    }
}