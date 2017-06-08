# espruino-self-update

## What is this?

A method to update code running on your Espruino from the Espruino.

## Requirements

* Espruino WiFi (untested with Pico + ESP8266)
* SD card + reader for Espruino WiFi
* Firmware 1v92.61 (until 1v93 is released)
* Some HTTP service to host your updates

## Getting started

### Hooking up SD card reader

1. You'll need an SPI compatible SD card reader. [This](http://www.hobbytronics.co.uk/microsd-card-regulated-v2) one is tested.
2. Connect CLK to A5, CS to B1, DI to A7, DO to A6

### Configuring Espruino

1. Configure your Espruino IDE for "Projects" mode, go to Settings -> Project and select a directory.
2. Browse to the directory you selected and find the "modules" sub-directory.
3. Place `bootstrap.js` in this "modules" directory.
4. Flash the following code snippet to the Espruino, customising for your own project settings.

```
function onInit() {
  setTimeout(function() {
    console.log("onInit");
    SPI1.setup({ mosi: A7, miso: A6, sck: A5 });
    E.connectSDCard(SPI1, B1);

    var bootstrap = require('bootstrap');

    bootstrap.update({
      ssid: 'mySSID',
      password: 'myPassword',
      source: 'http://my.update.server/directory/',
    }, function() {
      var mycode = require('mycode');
      mycode.start();
    });
  }, 1000);
}
```

### Configuring Update Server

Configuring an actual web server is out of scope for this document, but the Internet has lots of help here.

1. Create a manifest.json file in a web-accessible directory.
```
{
  "files": [
    "mycode.js",
  ]
}
```
2. Create the files listed in the manifest.json. These will automatically be updated on the Espruino.

## Troubleshooting

##### Uncaught InternalError: Failed! mbedtls_ssl_handshake returned

Your Espruino has probably run out of memory, or the source for your update is trying
to negotiate a secure connection that the Espruino can't match.

Try using a HTTP source instead.

##### Uncaught SyntaxError after update complete

Assuming there is nothing wrong with the update you are trying to apply,
this sometimes happens for no reason I can think of.

Try reflashing your Espruino.

##### Uncaught Error: Unable to mount media

Something is wrong with your SD card. Try unplugging it and reseating it, or
remove power from your Espruino and try again.

##### Checking... There were (x) errors!

Seems to happen sometimes, I don't know why. Doesn't seem to cause any problems.
