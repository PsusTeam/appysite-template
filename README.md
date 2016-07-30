# Appysite Template
A theme builder for Appysite pages built on top of the Zurb Foundation v6.x with the flavor of the Sass and ES2015.

## Requirements

You'll need to have the following packages installed before continuing.

  * [Node.js](http://nodejs.org): Use the installer provided on the NodeJS website
  * Update the `npm`: `npm install -g npm` if needed
    * Have a look at [npm troubleshooting](https://github.com/npm/npm/wiki/Troubleshooting)
  * [Gulp](http://gulpjs.com/): install gulp `[sudo] npm install -g gulp`
  * [Bower](http://bower.io): install bower `[sudo] npm install -g bower`
  
## Install
Hmm... What about cloning the repo?

```bash
git clone https://github.com/PsusTeam/appysite-template.git
```

## Up and Running

```bash
cd appysite-template
npm install && bower install
```

Configure the Appysite theme builder, using the `appysite.json` file:

```json
{
  "title": "App's title",
  "slogan": "Your slogan here...",
  "description": "Your description here...",
  "link": "http://myawesomeapp.com",
  "screenshots": [
    "http://domain.com/path/to/image1.jpg",
    "http://domain.com/path/to/image2.jpg",
    "http://domain.com/path/to/image3.jpg",
    "http://domain.com/path/to/image4.jpg"
  ]
}
```

### Gulp tasks

```bash
gulp            # shorthand for "gulp build" and "gulp serve"
                # ... builds the project in development mode
                # ... runs an HTTP server through browser-sync

gulp build      # builds the project in development mode
gulp serve      # serves the files through browser-sync
                    
gulp watch      # builds and serves the project
                # ... watchs the file changes to rebuild and hot reload
                
gulp html       # builds the HTML files using the appysite.json
gulp images     # copies the images to dest
                # ... optimizes them for web in production mode
gulp fonts      # copies the web fonts to dest
gulp css        # compiles the Sass files and copy the output to dest
                # ... minifies and autoprefixes the CSS declarations
                # ... packs the media queries in order (as of authoring)
gulp foundation # transpiles the zurb foundation's JS files to ES5
gulp js         # sets the <head> and <body> script files
                # ... transpiles the author's JS files to ES5
                # ... concatenates and uglifies them in production mode
```

#### Options

```bash
gulp <task> --production   # builds and serves the files in production mode
                           # minified assets, legacy browsers compatibility
                           
gulp <task> --path=./path/to/dest   # sets the path of the destination
```

## License

Released under the [MIT license](LICENSE).