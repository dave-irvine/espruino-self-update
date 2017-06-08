function onInit() {
  setTimeout(function() {
    console.log("onInit");
    SPI1.setup({ mosi: A7, miso: A6, sck: A5 });
    E.connectSDCard(SPI1, B1);

    var bootstrap = require('bootstrap');

    bootstrap.update({
      ssid: 'mySSID',
      password: 'myPassword',
      source: 'https://raw.githubusercontent.com/solworksltd/espruino-self-update/master/updates/',
    }, function() {
      var mycode = require('mycode');
      mycode.start();
    });
  }, 1000);
}
