var wifi = require('EspruinoWiFi');
var fs = require('fs');
var http = require('http');

function initWifi(callback) {
  console.log('Bootstrap :: Configuring WiFi');
  digitalWrite(A14, 0);

  Serial2.setup(115200, { rx: A3, tx : A2 });
  at = require('AT').connect(Serial2);

  at.cmd('\r\nAT+RST\r\n', 10000, function(data) {
    callback();
  });

  digitalWrite(A13, 1);
  digitalWrite(A14, 1);
}

function configureBaud(options, callback) {
  console.log('Bootstrap :: Configuring WiFi baud rate and flow control');
  var at = wifi.at;

  at.cmd('AT+UART_CUR=' + options.baud + ',8,1,0,2\r\n', 10000, function (data) {
    if (data === 'OK') {
      // Reconfigure serial and flush buffer
      Serial2.setup(options.baud, { rx: A3, tx : A2, cts: A15 });

      at.cmd('AT\r\n', 1000, callback);
    } else {
      throw new Error('Failed to set baud rate');
    }
  });
};

function joinAP(options, callback) {
  console.log('Bootstrap :: Joining Access Point');
  wifi.connect(options.ssid, { password: options.password }, callback);
}

function fetchFile(options, callback) {
  var parsedSource = url.parse(options.source);
  var port = parsedSource.port;

  if (!port) {
    port = (parsedSource.protocol === 'https:') ? 443 : 80;
  }

  var httpOptions = parsedSource;
  httpOptions.port = port;
  httpOptions.path += options.filename;

  http.request(httpOptions, function(requestResult) {
    var allData = '';

    requestResult.on('close', function(data) {
      callback(allData);
    });

    requestResult.on('data', function (data) {
      allData += data;
    });
  }).end();
}

function streamFile(options, callback) {
  var parsedSource = url.parse(options.source);
  var port = parsedSource.port;

  if (!port) {
    port = (parsedSource.protocol === 'https:') ? 443 : 80;
  }

  var httpOptions = parsedSource;
  httpOptions.port = port;
  httpOptions.path += options.filename;

  var fileStat = fs.statSync(options.target);

  if (fileStat) {
    console.log('Bootstrap :: Removing local copy of ' + options.filename);
    try {
      fs.unlink(options.target);
    } catch(err) {
      console.log(err);
    }
  }

  var f = E.openFile(options.target, 'a');

  http.request(httpOptions, function(requestResult) {
    requestResult.pipe(f, {
      chunkSize: 512,
      complete: function() {
        console.log('Bootstrap :: ' + options.filename + ' successfully downloaded');
        f.close();

        callback();
      }
    });
  }).end();
}

function fetchManifest(options, callback) {
  console.log('Bootstrap :: Fetching manifest');

  fetchFile({
    source: options.source,
    filename: 'manifest.json',
  }, function(data) {
    var manifest = JSON.parse(data);
    var files = manifest.files.length;
    var fetched = 0;

    var checkAllFilesFetched = function() {
      console.log('Bootstrap :: Fetched ' + fetched + '/' + files);

      if (fetched >= files) {
        callback();
      }
    }

    console.log('Bootstrap :: ' + files + ' files to fetch');
    checkAllFilesFetched();

    manifest.files.forEach(function (file) {
      console.log('Bootstrap :: Fetching ' + file);

      streamFile({
        filename: file,
        source: options.source,
        target: 'node_modules/' + file,
      }, function() {
        fetched++;
        checkAllFilesFetched();
      });
    });
  });
}

function beginUpdate(options) {
  console.log('Bootstrap :: Ready to update');

  fetchManifest(options, function() {
    console.log('Bootstrap :: Update complete');

    setTimeout(function() {
      global.skipUpdate = true;
      save();
    }, 1000);
  });
}

function displayHelp() {
  console.log('Bootstrap :: Help');
  console.log('');
  console.log('bootstrap.update(options)');
  console.log('Begin an update using the given options.');
  console.log('');
  console.log('Options:');
  console.log('');
  console.log('ssid : The ssid to connect to in order to perform the update');
  console.log('password : The password for the ssid to connect to');
  console.log('source : The server address hosting the update');
}

function checkSDCard(callback) {
  console.log('Bootstrap :: Checking SD Card');
  var files = fs.readdirSync('node_modules');
  console.log('Bootstrap :: Found files: ');
  console.log(files);
  console.log('Bootstrap :: SD Card OK');
  callback();
}

function update(options, callback) {
  if (global.skipUpdate) {
    console.log('Bootstrap :: Skipping update');
    global.skipUpdate = false;
    return callback();
  }

  if (!options.ssid) {
    console.log('Bootstrap :: Invalid configuration, no "ssid" defined');
    displayHelp();
    return;
  }

  if (!options.password) {
    console.log('Bootstrap :: Invalid configuration, no "password" defined');
    displayHelp();
    return;
  }

  if (!options.source) {
    console.log('Bootstrap :: Invalid configuration, no "source" defined');
    displayHelp();
    return;
  }

  checkSDCard(function() {
    initWifi(function(err) {
      if (err) { throw err; }

      joinAP(options, function(err) {
        if (err) { throw err; }

        configureBaud({
          baud: 115200,
        }, function() {
          wifi.getIP(function (err) {
            if (err) { throw err; }

            beginUpdate({
              source: options.source,
            });
          });
        });
      });
    });
  });
}

module.exports = {
  update: update,
};
