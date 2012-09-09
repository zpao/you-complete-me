var Rdio = require('rdio');
var prompt = require('cli-prompt');
var fs = require('fs');

var config;
var rdio;
var username;
var albumsProcessed = 0;
var processedAlbums = {
  above: [],
  below: [],
  complete: [],
  unstreamable: []
};
var tracks = [];

// read config.json
fs.readFile('config.json', function(e, data) {
  if (e) throw e;

  config = JSON.parse(data);
  go();
});

// write out the file… let it happen async, we don't really care
function writeConfigFile() {
  fs.writeFile('config.json', JSON.stringify(config, null, 2), function(e) {
    if (e) console.error(e);
  });
}

function go() {
  // set up Rdio object
  rdio = new Rdio({
    rdio_api_key: config.rdio.api_key,
    rdio_api_shared: config.rdio.api_shared,
    callback_url: 'oob'
  });

  // get the username, see if we have it in saved oauth
  prompt('enter Rdio username: ', function(val, end) {
    username = val;
    end();
    if (username in config.oauth) {
      theRealDeal();
    }
    else {
      getOAuth(theRealDeal);
    }
  });
}

function getOAuth(callback) {
  rdio.getRequestToken(function(error, oauth_token, oauth_token_secret, results) {

    loginURL = results.login_url + '?oauth_token=' + oauth_token;
    console.log('please visit', loginURL, 'and return here to enter the pin');

    prompt("pin: ", function(val, end) {
      oauth_verifier = val;
      end();

      rdio.getAccessToken(oauth_token, oauth_token_secret, oauth_verifier,
                          function(error, oauth_token, oauth_token_secret, results) {

        config.oauth[username] = { token: oauth_token, secret: oauth_token_secret };
        writeConfigFile();
        callback();
      });
    });
  });
}

// start here for reals
function theRealDeal() {
  getUser(username, function(user) {
    getAndProcessNextAlbum(user, printResults);
  });
}

// wrapper around the rdio
function r(data, callback) {
  rdio.api(config.oauth[username].token, config.oauth[username].secret, data, callback);
}

// get the rdio user
function getUser(name, callback) {
  var data = {
    method: 'findUser',
    vanityName: name
  };
  r(data, function(e, rdata) {
    if (e) throw e;
    callback(JSON.parse(rdata).result);
  });
}

// print it all out
function printResults() {
  console.log('Found', processedAlbums['complete'].length, 'complete albums');
  console.log('Found', processedAlbums['below'].length, 'albums we wouldn\'t complete');
  console.log('Found', processedAlbums['above'].length, 'albums we would complete');
  console.log(processedAlbums['above'].join('\n'));
  console.log('Adding', tracks.length, 'tracks to your collection…');
  addToCollection(tracks, function() {
    console.log('… done\n');

    if (config.api.show_unstreamable) {
      console.log('Found', processedAlbums['unstreamable'].length, 'albums that aren\'t streamable');
      console.log(processedAlbums['unstreamable'].join('\n'));
    }
  });
}

// really just another wrapper around another api call
function addToCollection(ids, callback) {
  // TODO chunk this? API doesn't say if there's a limit
  var data = {
    method: 'addToCollection',
    keys: ids.join(',')
  };
  r(data, function(e, rdata) {
    if (e) {
      console.error(e);
      throw(e);
    }
    callback();
  });
}

// most of the work here
function getAndProcessNextAlbum(user, callback) {
  if (config.app.album_limit && albumsProcessed >= config.app.album_limit ) {
    callback();
    return;
  }

  var data = {
    method: 'getAlbumsInCollection',
    user: user.key,
    start: albumsProcessed + 1,
    count: config.app.album_chunk_size
  };
  r(data, function(e, rdata) {
    if (e) {
      console.error(e);
      throw(e);
    }
    var albums = JSON.parse(rdata).result;

    if (!albums.length) {
      callback();
      return;
    }

    albums.forEach(function(album) {
      var ratio = album.trackKeys.length / album.itemTrackKeys.length;
      var s = [
        album.trackKeys.length + '/' + album.itemTrackKeys.length,
        album.shortUrl,
        album.artist + ' - ' + album.name
      ].join('\t');

      if (ratio == 1) {
        processedAlbums['complete'].push(s);
      }
      else if (ratio < config.app.autocomplete_threshold) {
        processedAlbums['below'].push(s);
      }
      // or >=
      else {
        processedAlbums['above'].push(s);
        if (config.app.complete_albums) {
          album.itemTrackKeys.forEach(function(track) {
            if (album.trackKeys.indexOf(track) == -1) {
              tracks.push(track);
            }
          });
        }
      }

      // also add to the unstreamable list
      if (!album.canStream && config.app.show_unstreamable) {
        processedAlbums['unstreamable'].push(s);
      }
    });

    albumsProcessed += albums.length;

    getAndProcessNextAlbum(user, callback);
  });
}

