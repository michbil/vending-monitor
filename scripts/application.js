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

var app;

function recalc_time () {



        now = Date.now();



        $.each(app.timestamps,function(a,b) {

            then = Date.parse(b);
            var seconds = (now - then) / 1000;
            //console.log(this.formatTime(seconds));
            var name = '#list'+a;

            $(name).html(app.formatTime(seconds));
            //setTimeout(recalc_time,1000);

        })



}

litersafter=-1;
moneyafter = -1;



app = {

    data: {},
    queryRunning: false,
    graphdata: [],
    timestamps: {},
    readaddr:0,
    readmax:0x400,
    finishcallback:null,
    eedata:new BinaryBuffer(2048),
  
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
                that.queryDeviceState(device);
                that.subscribeNotifications(device);
                setHeight(0);
            })
            .fail(that.handleError);


        setInterval(recalc_time,3000);
        //this.queryNotifications("VOLUME_S");
    },

    queryNotifications: function (equipment) {
        var that = this;

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
                var i = 0;
                _.each(data, function (incomingNotification) {
                    if (incomingNotification.parameters.equipment == equipment) {
                        var date = new Date(incomingNotification.timestamp)
                        epoch = date.getTime()
                        tuple = {"id":i++,"time":epoch,'value':incomingNotification.parameters.value}
                        that.graphdata.push(tuple);
                        
                    }
                });
                that.graphdata[0];
                
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

    formatTime: function(seconds) {
        if (seconds < 0) seconds = 0;

        days = Math.floor(seconds/86400)
        seconds = seconds-(days*86400);
        hours = Math.floor(seconds/3600)
        seconds = seconds-(hours*3600);
        minutes = Math.floor(seconds/60)
        seconds = seconds-(minutes*60);
        
      


        if (days == 0) {

            if (hours == 0) {

                if (minutes == 0) {

                    return "Онлайн";

                } else {
                    return minutes + "мин. ";
                }

            } else {
                return hours + " ч.";
            }

        } else {
            return days + " д. " + hours + ' ч.';
        }

    },



    register_time: function (deviceid,time) {
        t = Date.parse(time);
        oldstamp = this.timestamps[deviceid]
        if (oldstamp == undefined)  {
            oldstamp = 0;
        } else {
            oldstamp = Date.parse(oldstamp)
        }
        if (oldstamp == undefined) oldstamp = 0;
        if (t > oldstamp) {
            //this.timestamp = t;
            this.timestamps[deviceid]=time;
        }
    
    },

    // gets current led state
    queryDeviceState: function (device) {
        var that = this;
        this.deviceHive.getEquipmentState(device.id)
            .done(function (data) {
                jQuery.each(data, function (index, equipment) {
                    that.decodeEquipment(equipment.id,equipment);
                    that.register_time(device.id,equipment.timestamp);
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

    addConsole: function (t) {
        $$('console').add({
            text: t
        })
        console.log(t)
    },
    updateEepromTable: function (adr,values) {

        col = Math.floor(adr/16)*16
        stradr = col.toString(16).toUpperCase()
        zeros = 4 - stradr.length
        ressstr = "0x"
        for (i=0;i<zeros;i++) ressstr = ressstr + '0';
        ressstr += stradr

        console.log(ressstr) 

        that = this

        obj = $$('hexeditor').getItem(ressstr)

        if (obj != undefined) {
            for (i=0;i<16;i++) {
                index = 'b' + i.toString('10')
                obj[index] = values[i].toString(16)
                that.eedata.write(adr+i,values[i])

            }
            $$('hexeditor').refresh()
        }
        
    },

    // handles incoming notification
    handleNotification: function (deviceId, notification) {

        console.log(notification.notification)
        this.register_time(deviceId,notification.timestamp);



        if (deviceId != currentId) return;

        var date = new Date()
        var tick = date.getTime();
        var delta = tick - oldtick;

        $('.channel-state').text((delta)+'c.');


        oldtick = tick;
        that = this;
        

        if (notification.notification == "equipment") {
           
                this.decodeEquipment(notification.parameters.equipment,notification);

        } else 
        if (notification.notification == "logline") {
            this.addConsole(notification.parameters.line)
        }
        if (notification.notification == "eeblock") {
           // this.addConsole(notification.parameters.adr+" : "+notification.parameters.value)
           this.updateEepromTable(notification.parameters.adr,notification.parameters.value)
           this.readaddr = this.readaddr + 16;
           if (this.readaddr < this.readmax) {
                that.deviceHive.sendCommand(that.device.id, "ReadEeprom", { adr: that.readaddr })
           } else {
            if (this.finishcallback) this.finishcallback();
           }
            
        }
        
        else if (notification.notification == "$device-update") {
            if (notification.parameters.status) this.device.status = notification.parameters.status;
            if (notification.parameters.name) this.device.name = notification.parameters.name;
            this.updateDeviceInfo(this.device);
        }
    },

    readRange: function (start,end,callback) {

        that = this;

        if (start < end)  {
            console.log("reading...")
            that.readaddr = start;
            that.readmax  = end;
            that.deviceHive.sendCommand(that.device.id, "ReadEeprom", { adr: that.readaddr })
                .fail(that.handleError);
            this.finishcallback = callback;
        }



    },

    // bind LED On/Off button click handler
    readEE: function () {
        var that = this;

        webix.extend($$("hexeditor"), webix.ProgressBar);
        $$("hexeditor").showProgress({  type:"icon", });

        this.readRange (0,2048,null);

        $$("hexeditor").hideProgress();
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
        litersafter=value;
        updateValue("basicsets","inc_liters",value+'л'); 
    },
    updateMoneyAfterIncassation: function(value) {
        moneyafter=value;
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
    },

    parseEE: function() {
    that = this;

        

       this.readRange(0x130,0x200,function() {
            this.eedata.parse_contents(that)
       });
       
        

    },
    resetDev: function () {
        this.deviceHive.sendCommand(this.device.id, "Reset", {});
    },
    serviceMode: function (enable) {
        var serviceModePass = "gnqYoo[14^^^1z/";
        this.deviceHive.sendCommand(this.device.id, "ServiceMode", {"enter":enable,"pass":serviceModePass});
    },
    write_config: function () {
        this.eedata.write_config(this)
    },
    read_incass: function() {

        webix.extend($$("incassation"), webix.ProgressBar);

        $$("incassation").showProgress({  type:"icon", });

        this.readRange(0x90,0x100,function() {
            $$('incassation').clearAll();

        $$('incassation').add({
            'no':'Грядущая',
            'sum':moneyafter,
            'liters':litersafter,
            'price':100*(moneyafter/litersafter),
        });

        for (i=0;i<10;i++) {
            item = this.eedata.read_incass(i);
            if (item) $$('incassation').add(item);
        }
        
        $$("incassation").hideProgress();

        });
        
    }

}