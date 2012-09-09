# You Complete Me

Because when [Rdio](http://www.rdio.com) imported my iTunes library, it didn't do it all the way.

* * *

This is a pretty simple script that uses node and the Rdio API to do some basic analysis of (and modifications to) your Rdio collection. It will complete albums that you have in your collection that meet a certain "completeness" threshold.

While I was doing this, I noticed that I have a bunch of albums in my collection that don't show up on Rdio. So I added another bit of info to output - any album that isn't currently streamable. Sometimes this is a "shadow" copy of an album you thought you had, so it can be useful. If you want to hide this, set `config.app.show_unstreamable = false`.


## Get Going

1. Copy `config.json.sample` to `config.json`
2. Get an [Rdio API key](http://developer.rdio.com/)
3. Edit `config.json` to include your `api_key` and `api_shared`
4. Tweak your threshold and other settings in there too.
5. Run `npm install` to install the dependencies
6. Run `node you-complete-me.js`


## Settings

These are just for `config.app.*`

* `album_chunk_size` - The number of albums to grab at once from Rdio (the API doesn't specify a limit, so beware)
* `album_limit` - The number of total albums to grab. Set to `0` to get all albums.
* `autocomplete_threshold` - Threshold of tracks/total per album that will cause the album to be completed.
* `complete_albums` - Actually make the API calls to complete the album.
* `show_unstreamable` - Show albums that are in your collection but aren't currently streamable.


## Words of Warning

This will modify your Rdio collection (if you leave `config.app.complete_album = true`).
