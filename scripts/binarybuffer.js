
function isNumber(n){
    return typeof n == "number" 
}


function BinaryBuffer(len) {

	this.buffer = []

  EEADDR_TOTAL_LITERS=0x0; // len = 10*5 = 50байт
        TOTAL_REPEATS= 10;
        COUNTER_LEN= 5;

        EEADDR_LAST_ICASSATION1= 0x34;
        EEADDR_LAST_ICASSATION2= 0x38;

        EEADDR_MONEY= 0x40;
        EEADDR_OFFSET= 0x80;
        EEADDR_INCASSATIONS= 0x90;
        NUM_INCASSATIONS= 10;
        EEADDR_LOWER_LIMIT= 0x100;
        EEADDR_LOWER_LIMIT_COPY= 0x104;
        EEADDR_CALIBRATE_ENDPOINT= 0x108;
        EEADDR_VENDING_LOCK= 0x109;
        EEADDR_MAX_LEVEL= 0x110;
        EEPROM_CONFIG_ADR= 0x130;


        counter_mul = 0;
        counter_add = counter_mul + 4;
        pressure_zero = counter_add + 4;

        temp1_on = pressure_zero + 1;
        temp1_off = temp1_on + 2;
        temp2_on = temp1_off + 2;
        temp2_off = temp2_on + 2;

        volume_50 = temp2_off + 2;
        volume_100 = volume_50 + 4;
        volume_150 = volume_100 + 4;
        volume_200 = volume_150 + 4;
        volume_250 = volume_200 + 4;
        volume_300 = volume_250 + 4;

        maxmoney = volume_300 + 4;
        allowmany = maxmoney + 2;

        GUID = allowmany + 1;
        NAME = GUID + 40;

        checksum = NAME + 40;
        len = checksum + 4;

        INC_SZ = 13;

     


}
BinaryBuffer.prototype = {

	__class_name:"BinaryBuffer",
	constructor: BinaryBuffer,

	read: function (adr) {
		return  this.buffer[adr];
	},
	write: function (adr,value) {
		this.buffer[adr] = value & 0xFF;
	},

    read_uint8: function (adr) {

        return this.read(adr);
        
    },
    write_uint8:function (adr,value) {
    	this.write(adr,value)
    },

    read_uint16: function  (adr) {

        return this.read(adr) + (this.read(adr+1) << 8);
        
    },

    write_uint16: function  (adr,value) {

        this.write(adr,value & 0xFF) 
        this.write(adr+1,(value >> 8) & 0xFF);
        
    },

    read_int16: function  (adr) {

    	var sign = this.read(adr+1) & 0x80;

    	if (sign) {
    		return ((this.read(adr) + (this.read(adr+1) << 8)) ^ 0xFFFF) - 1;
    	} else {
    		return this.read(adr) + (this.read(adr+1) << 8);
    	}

        
        
    },
    write_int16: function  (adr,value) {

    	

    	if (value < 0) value = ((-value) ^ 0xFFFF)+1;

        this.write(adr,value & 0xFF) 
        this.write(adr+1,(value >> 8) & 0xFF);
        
    },


    read_uint32: function  (adr) {

        return this.read(adr) + (this.read(adr+1) << 8) + (this.read(adr+2) << 16)+ (this.read(adr+3) << 24);
        
    },

    read_uint32_be: function  (adr) {

        return this.read(adr+3) + (this.read(adr+2) << 8) + (this.read(adr+1) << 16)+ (this.read(adr) << 24);
        
    },

    write_uint32: function  (adr,value) {

        this.write(adr,value & 0xFF) 
        this.write(adr+1,(value >> 8) & 0xFF);
        this.write(adr+2,(value >> 16) & 0xFF);
        this.write(adr+3,(value >> 24) & 0xFF);
        
    },

    write_int32: function (adr,value) {
    	this.write_uint32(adr,value);
    },

    read_int32: function  (adr) {
    	//var sign = (this.read(adr+3) << 24) & 0x80;
    	sign = 0;

    	if (sign) {
    		return  v  = -1* (this.read(adr) + (this.read(adr+1) << 8) + (this.read(adr+2) << 16)+ ((this.read(adr+3) << 24)&0x7F));
    	} else {
    		return  v =  this.read(adr) + (this.read(adr+1) << 8) + (this.read(adr+2) << 16)+ (this.read(adr+3) << 24);	
    	}
        
        
    },
    readString: function (adr,len) {
    	var s = "";
    	for (i=0;i<len;i++) {
    		var c = this.read(adr+i);
    		if (c==0) break;
    		s = s + String.fromCharCode(c);
    	}
    	return s;
    },

    writeString: function (adr,str,len) {
    	if (str.length > len) return;
    	for (i=0;i<str.length;i++) {
    		this.write(adr+i,str.charAt(i))
    	}
    	this.write(adr+i+1,0)
    },

    calc_checksum: function(start,end) {

    	var cs = 0;

    	for (i=start;i<end;i++) {
    		c = this.read(i);  		
    		cs += c;

    	}
    	return cs;

    },

    parse_contents: function (app) {


    	updateValue("settings","counter_mul",this.read_uint32(EEPROM_CONFIG_ADR + counter_mul));

    	updateValue("settings","counter_add",this.read_uint32(EEPROM_CONFIG_ADR + counter_add)/ 1000000);
    	updateValue("settings","pressure_zero",this.read_uint8(EEPROM_CONFIG_ADR + pressure_zero)*5/1024);    	

    	updateValue("settings","temp1_on",this.read_uint16(EEPROM_CONFIG_ADR + temp1_on)/10);
    	updateValue("settings","temp1_off",this.read_uint16(EEPROM_CONFIG_ADR + temp1_off)/10);

    	updateValue("settings","temp2_on",this.read_uint16(EEPROM_CONFIG_ADR + temp2_on)/10);
    	updateValue("settings","temp2_off",this.read_uint16(EEPROM_CONFIG_ADR + temp2_off)/10);

    	updateValue("settings","volume_50",this.read_int32(EEPROM_CONFIG_ADR + volume_50)/ 1000000);
    	updateValue("settings","volume_100",this.read_int32(EEPROM_CONFIG_ADR + volume_100) / 1000000);
    	updateValue("settings","volume_150",this.read_int32(EEPROM_CONFIG_ADR + volume_150) / 1000000);
    	updateValue("settings","volume_200",this.read_int32(EEPROM_CONFIG_ADR + volume_200) / 1000000);
    	updateValue("settings","volume_250",this.read_int32(EEPROM_CONFIG_ADR + volume_250) / 1000000);
    	updateValue("settings","volume_300",this.read_int32(EEPROM_CONFIG_ADR + volume_300) / 1000000);

    	updateValue("settings","maxmoney",this.read_uint16(EEPROM_CONFIG_ADR + maxmoney)/10);
    	updateValue("settings","allowmany",this.read_uint8(EEPROM_CONFIG_ADR + allowmany));

    	uid = this.readString(EEPROM_CONFIG_ADR+GUID,40);
    	ap_name = this.readString(EEPROM_CONFIG_ADR+NAME,40);

    	updateValue("settings","NAME",ap_name);
    	updateValue("settings","GUID",uid);

    	console.log(this.read_uint32(EEPROM_CONFIG_ADR+checksum));
    	console.log(this.calc_checksum(EEPROM_CONFIG_ADR,EEPROM_CONFIG_ADR+checksum));



    	//console.log ();
    },

    validateConfig: function(v) {

    	var error=0;

    	function check_int(value,min,max,strname) {

    		value = Number(value)

	    	if (!isNumber(value)) {
	    		error=1;
	    		window.alert(strname+" не является числом");
	    		return 1;
	    	}

	    	if ((value < min)  || (value > max)) {
	    		errror = 1;
	    		window.alert(strname+" вне допустимых переделов");
	    		return 1;
	    	}

    	}

    	function check_temp(value,strname) {
    		check_int(value,-37.0,50.0,strname);
    	}

    	function check_liters(value,strname) {
    		check_int(value,0,55.0,strname);
    	}


    	check_int(v.counter_mul,0,100000,"Коеффициент расходомера");if (error) return 1;
    	check_int(v.counter_add,-0.5,0.5,"Коррекция объема");if (error) return 1;
    	check_int(v.pressure_zero,0,1.5,"Коррекция датчика уровня");if (error) return 1;

    	check_temp(v.temp1_on,"t включения ламп");if (error) return 1;
    	check_temp(v.temp1_off,"t выключения ламп");if (error) return 1;
    	check_temp(v.temp2_on,"t включения матм");if (error) return 1;
    	check_temp(v.temp2_off,"t выключения мата");if (error) return 1;

    	check_liters(v.volume_50,"Литров за 50 коп");if (error) return 1;
    	check_liters(v.volume_100,"Литров за 100 коп");if (error) return 1;
    	check_liters(v.volume_150,"Литров за 150 коп");if (error) return 1;
    	check_liters(v.volume_200,"Литров за 200 коп");if (error) return 1;
    	check_liters(v.volume_250,"Литров за 250 коп");if (error) return 1;
    	check_liters(v.volume_300,"Литров за 300 коп");if (error) return 1;

    	check_int(v.maxmoney,0,100.0,"Макс сумма");if (error) return 1;
    	check_int(v.allowmany,0,100,"Наливать несколько бутылей");if (error) return 1;

    	return error;



    },

    write_config: function (app) {
    	v = $$('settings').getValues()

    	this.validateConfig(v);

    	v.counter_add = Number(v.counter_add) * 1000000;
    	v.pressure_zero = Math.round(Number(pressure_zero) * 1024/5);
    	v.temp1_on = Math.round(Number(v.temp1_on)*10);
    	v.temp1_off = Math.round(Number(v.temp1_on)*10);
    	v.temp2_on = Math.round(Number(v.temp1_on)*10);
    	v.temp2_off = Math.round(Number(v.temp1_on)*10);

    	v.volume_50 = Math.round(Number(volume_50) / 1000000);
    	v.volume_100 = Math.round(Number(volume_50) / 1000000);
    	v.volume_150 = Math.round(Number(volume_50) / 1000000);
    	v.volume_200 = Math.round(Number(volume_50) / 1000000);
    	v.volume_250 = Math.round(Number(volume_50) / 1000000);
    	v.volume_300 = Math.round(Number(volume_50) / 1000000);

    	v.maxmoney = Math.round(Number(maxmoney)*10);


    	function write_at_offset(off) {

			this.write_uint32(off + counter_mul,v.counter_mul);
			this.write_uint32(off + counter_add,v.counter_add);
	    	this.write_uint8 (off + pressure_zero,v.pressure_zero);

			this.write_uint16(off + temp1_on,v.temp1_on);
			this.write_uint16(off + temp1_off,v.temp1_off);
			this.write_uint16(off + temp2_on,v.temp2_on);
			this.write_uint16(off + temp2_off,v.temp2_off);
	    	
			this.write_int32(off + volume_50,v.volume_50);
			this.write_int32(off + volume_100,v.volume_100);
			this.write_int32(off + volume_150,v.volume_150);
			this.write_int32(off + volume_200,v.volume_200);
			this.write_int32(off + volume_250,v.volume_250);
			this.write_int32(off + volume_300,v.volume_300);


	    	this.write_uint16(off + maxmoney,v.maxmoney);
	    	this.write_uint8(off + allowmany,v.allowmany);

	    	this.readString(off+GUID,v.GUID,40);
	    	this.readString(off+NAME,v.NAME,40);

	    	this.write_uint32(off+checksum,this.calc_checksum(off,off+checksum));

		}
		write_at_offset(EEPROM_CONFIG_ADR);
		write_at_offset(EEPROM_CONFIG_ADR+len);

    },

    read_incass: function(n) {

       

        n = EEADDR_INCASSATIONS + n*INC_SZ;

        tmp_inc = {}

        tmp_inc['no'] = this.read_uint32_be(n);n=n+4;
        tmp_inc['sum'] = this.read_uint32_be(n)/10;n=n+4;
        tmp_inc['liters'] = this.read_uint32_be(n)/100;n=n+4;
        tmp_inc['cs'] = this.read_uint8(n);

        tmp_inc['price'] = (tmp_inc['sum'] / tmp_inc['liters'])*100;

        if (tmp_inc['no']==-1) return null;
    
        return tmp_inc


    },





}
