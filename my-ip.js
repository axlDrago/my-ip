var email = require("emailjs");
var http = require("https");
var internetAvailable = require("internet-available");
const fs = require("fs");
const config = require('./config');

function GetMyIp() {
  this.text = '';
  this.interval = 3600000; //Интервал проверки IP
  this.intervalNoInternet = 300000; //Интервал проверки IP
  this.ip = '';
  this.options = {
    "method": "GET",
    "hostname": "freegeoip.app",
    "port": null,
    "path": "/json/",
    "headers": {
      "accept": "application/json",
      "content-type": "application/json"
    }
  };

  this.serverOptions = config;
}
/**
 * Получаем внешний IP
 */
GetMyIp.prototype.getIP = function () {
  // console.log('GetingIp.....');
  let _this = this;
  var req = http.request(this.options, function (res) {
    var chunks = [];

    res.on("data", function (chunk) {
      chunks.push(chunk);
    });

    res.on("end", function () {
      var body = Buffer.concat(chunks);
      var ip = JSON.parse(body.toString());
      if(ip.ip != _this.ip) {
        _this.ip = ip.ip;
        _this.sendEmail();
      } else {
        // console.log('IP не изменился');
        _this.text = 'IP не изменился\n----------------------------------------\n';
        _this.log();
        _this.timeOut();
      }
    });
  });

  req.end();
};

/**
* Метод проверки соединения с интернетом
*/
GetMyIp.prototype.internetAvailable = function() {
  var _this = this;
internetAvailable({
    // Provide maximum execution time for the verification
    timeout: 5000,
    // If it tries 5 times and it fails, then it will throw no internet
    retries: 5
}).then(() => {
    //console.log("Internet available");
    _this.getIP();
}).catch(() => {
    _this.text = "Нет соединения с интернетом \n----------------------------------------\n" + Date() ;
    _this.log();
    setTimeout(() => this.internetAvailable(), this.intervalNoInternet);
    //console.log("No internet");
});
}

/**
 * Отправляем сообщение
 */
GetMyIp.prototype.sendEmail = function () {
  // console.log('Отправляем IP: ' + this.ip);
  let _this = this;

  let server = email.server.connect({
    user: this.serverOptions.user,
    password: this.serverOptions.password,
    host: this.serverOptions.host,
    ssl: this.serverOptions.ssl
  });

  server.send({
    text:    "IP адрес: " + this.ip,
    from:    "Server <" + this.serverOptions.user + ">",
    to:      "Me <" + this.serverOptions.user + ">",
    subject: "New IP: " + _this.ip,
  }, function (err, message) {
      _this.text = "Ошибки: " + err + "\nОтправлен IP: " + _this.ip + "\n----------------------------------------\n" ;
      _this.log();
     //console.log(err || message);
    _this.timeOut();
  });
};

/**
 * Метод инициализации
 */
GetMyIp.prototype.start = function () {
  this.text = 'startApp: ' + Date();
  this.log();
  this.internetAvailable();
};

/**
 * Метод логирования
 */
GetMyIp.prototype.log = function () {
  fs.appendFileSync("log.txt", this.text + " \n");
}

/**
 * Метод таймаута, ожидаем 60 мин
 */
GetMyIp.prototype.timeOut = function () {
  setTimeout(() => this.start(), this.interval);
};

let getMyIp = new GetMyIp();
getMyIp.start();
