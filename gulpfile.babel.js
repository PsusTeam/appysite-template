//////////////////////////
// packages and plugins //
//////////////////////////
import gulp from 'gulp';
import fs from 'fs';
import yargs from 'yargs';
import browserReporter from 'postcss-browser-reporter';
import reporter from 'postcss-reporter';
import autoprefixer from 'autoprefixer';
import mqpacker from 'css-mqpacker';
import merge2 from 'merge2';
import browserSync from 'browser-sync';
import pngquant from 'imagemin-pngquant';
import rollup from 'rollup-stream';
import sourceStream from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import gulpLoadPlugins from 'gulp-load-plugins';

const $ = gulpLoadPlugins({
    pattern: [
        'gulp-*'
    ]
});

let pkg = JSON.parse(fs.readFileSync('./package.json'));
let appysite = JSON.parse(fs.readFileSync('./appysite.json'));
let argv = yargs.argv;
let devBuild = !argv.production;
let buildPath = argv.path || '';

// for the sake of preprocess template
appysite.screenshots = appysite.screenshots.toString();

// file locations
let
    source  = 'source/',
    build   = 'build/' + buildPath.trimRight('/') + '/',
    files = {
        scss   : source + 'scss/',
        js     : source + 'js/',
        images : source + 'images/',
        fonts  : source + 'fonts/',
        libs   : source + 'libs/',
        tmpl   : source + 'template-parts/'
    },
    dest = build + (devBuild ? 'development/' : 'production/'),

    // asset name
    assetName = (pkg.name.replace(/\s+/g, '-').toLowerCase() + '-v' + pkg.version).toLowerCase(),

    // banner at the top of the assets
    banner = ['/*!',
        ' * <%= pkg.name %> v<%= pkg.version %>+' + (new Date()).toISOString().slice(0,10).replace(/-/g, ''),
        ' * Coded by <%= pkg.author %> with care.',
        ' */',
        ''
    ].join('\n'),

    // images paths
    images = {
        in  : files.images + '**/*',
        out : dest + 'images/'
    },

    css = {
        in         : files.scss + 'main.scss',
        watch      : [files.scss + '**/*'],
        out        : dest + 'css/',
        outputFile : assetName + (! devBuild ? '.min' : '') + '.css',
        sassOpts   : {
            outputStyle: 'expanded',
            imagePath: 'images',
            includePaths: [
                'bower_components',
                'bower_components/glidejs/src/sass',
                'bower_components/foundation-sites/scss',
                'bower_components/modernizr-mixin/stylesheets'
            ],
            precision: 9,
            errLogToConsole: true
        },
        autoprefixer: {
            browsers: [
                'last 2 versions',
                'ie >= 10',
                'ff >= 35',
                'chrome >= 35',
                'safari >= 8',
                'ios >= 8',
                'android >= 4.4'
            ]
        },
    },

    fonts = {
        in  : [
            files.fonts + '*.*',
            'bower_components/font-awesome/fonts/*.*'
        ],
        out : dest + 'fonts/'
    },

    js = {
        header: [
            files.libs + 'modernizr/modernizr.js',
            files.libs + 'workaround/ie10-viewport-bug-workaround.js'
        ],
        dependencies: [
            'bower_components/jquery/dist/jquery.js',
            'bower_components/glidejs/dist/glide.js'
        ],
        foundation: {
            in: [
                //'bower_components/foundation-sites/js/foundation.core.js',
                //'bower_components/foundation-sites/js/foundation.util.mediaQuery.js',
                //'bower_components/foundation-sites/js/foundation.util.keyboard.js',
                //'bower_components/foundation-sites/js/foundation.util.timeAndImageLoader.js',
                //'bower_components/foundation-sites/js/foundation.tabs.js'
            ],
            out: files.libs + 'foundation/',
            // name of the compiled zurb foundation file
            name: 'foundation.js',
        },
        in: files.js + 'main.js',
        out: dest + 'js/',
        // name of the concatenated js files at the head
        headerFile: 'header-v' + pkg.version + '.min.js',
        // name of the concatenated js files within the body
        outputFile: assetName + (! devBuild ? '.min' : '') + '.js'
    },

    // html settings
    html = {
        in      : source + '*.html',
        watch   : [source + '*.html', files.tmpl + '**/*.html'],
        out     : dest,
        context : {
            appysite,
            devBuild   : devBuild,
            version    : pkg.version,
            url        : pkg.homepage,
            cssPath    : getRelativePath(css.out, true),
            cssFile    : css.outputFile,
            jsFile     : js.outputFile,
            jsHeadFile : js.headerFile,
            jsPath     : getRelativePath(js.out, true),
            // an array of dependency files
            devScripts : js.dependencies
                .concat(
                    fileExists(js.foundation.out + js.foundation.name) ?
                    js.foundation.out + js.foundation.name :
                    []
                )
                .map(getFileName).toString(),
            devHeadScripts: js.header
                .map(getFileName).toString()
        }
    },

    syncOpts = {
        server: {
            baseDir: dest,
            index: 'index.html'
        },
        open: false,
        notify: true
    };


////////////////
// Gulp tasks //
////////////////

// build HTML files
gulp.task('html', () => {
    return gulp.src(html.in)
        .pipe($.preprocess({
            context: html.context
        }))
        .pipe(gulp.dest(html.out));
});

// optimizing images
gulp.task('images', () => {
    return gulp.src(images.in)
        .pipe($.newer(images.out))
        .pipe($.if(! devBuild, $.imagemin({
            progressive: true,
            svgoPlugins: [{ removeViewBox: false }],
            use: [
                pngquant()
            ]
        })))
        .pipe(gulp.dest(images.out));
});

// copying fonts
gulp.task('fonts', () => {
    return gulp.src(fonts.in)
        .pipe($.newer(fonts.out))
        .pipe(gulp.dest(fonts.out));
});


// compiling scss using libsass and postcss
gulp.task('css', () => {
    var pcssPlugins = [
        browserReporter(),
        reporter()
    ];

    // add autoprefixer and media query packer in production mode
    if (! devBuild) {
        pcssPlugins.unshift(
            autoprefixer(css.autoprefixer),
            mqpacker()
        );
    }

    return gulp.src(css.in)
        .pipe($.sass(css.sassOpts).on('error', $.sass.logError))
        .pipe($.header(banner, { pkg : pkg } ))
        .pipe($.if(! devBuild, $.sourcemaps.init()))
        .pipe($.postcss(pcssPlugins))
        .pipe($.if(! devBuild, $.cssnano()))
        .pipe($.concat(css.outputFile))
        .pipe($.if(! devBuild, $.sourcemaps.write('.')))
        .pipe(gulp.dest(css.out))
        .pipe(browserSync.stream());
});

// compiling zurb foundation ES6 files using babel
gulp.task('foundation', () => {
    return gulp.src(js.foundation.in)
        .pipe($.babel())
        .pipe($.concat(js.foundation.name))
        .pipe(gulp.dest(js.foundation.out));
});


// transpiling the ES2015 files to ES5 with babel
// concatenate/minify javascripts
// specifying the foundation task a a dependency
gulp.task('js', ['foundation'], () => {
    if (devBuild) {
        return merge2(
            // copy and check the syntax of head javascripts
            gulp.src(js.header)
                .pipe($.newer(js.out))
                .pipe($.eslint())
                .pipe($.eslint.format())
                .pipe($.eslint.failAfterError())
                .pipe(gulp.dest(js.out)),
            
            // copy the dependencies
            gulp.src(js.dependencies)
                .pipe($.newer(js.out))
                .pipe(gulp.dest(js.out)),
            
            // copy the compiled zurb foundation file
            gulp.src(js.foundation.out + js.foundation.name)
                .pipe($.newer(js.out))
                .pipe(gulp.dest(js.out)),

            // copy and check the syntax of author javascript files
            // transpile the ES2015 files,
            rollup({
                entry: js.in
            })
            // point to the entry file.
            .pipe(sourceStream('main.js', files.js))
            // buffer the output. most gulp plugins, including gulp-sourcemaps,
            // don't support streams.
            .pipe(buffer())
            .pipe($.eslint())
            .pipe($.eslint.format())
            .pipe($.eslint.failAfterError())
            .pipe($.babel())
            .pipe($.concat(js.outputFile))
            .pipe($.header(banner, { pkg : pkg } ))
            .pipe(gulp.dest(js.out))
        );
    // on production mode
    } else {
        return merge2(
            // build header js file
            gulp.src(js.header)
                .pipe($.sourcemaps.init())
                .pipe($.concat(js.headerFile))
                .pipe($.uglify({
                    preserveComments: 'some'
                }).on('error', $.util.log))
                .pipe($.sourcemaps.write('.'))
                .pipe(gulp.dest(js.out)),

            merge2(
                gulp.src(js.dependencies.concat(
                    js.foundation.out + js.foundation.name
                )),
                rollup({
                    entry: js.in,
                    sourceMap: true
                })
                // point to the entry file.
                .pipe(sourceStream('main.js', files.js))
                // buffer the output. most gulp plugins, including gulp-sourcemaps,
                // don't support streams.
                .pipe(buffer())
                // tell gulp-sourcemaps to load the inline sourcemap produced
                // by rollup-stream.
                .pipe($.sourcemaps.init({
                    loadMaps: true
                }))
                .pipe($.babel())
            )
            .pipe($.uglify({
                preserveComments: 'some'
            }).on('error', $.util.log))
            .pipe($.concat(js.outputFile))
            .pipe($.header(banner, { pkg : pkg } ))
            .pipe($.sourcemaps.write('.'))
            .pipe(gulp.dest(js.out))
        );
    }
});

// browser sync
gulp.task('serve', () => {
    browserSync(syncOpts);
});

// build the pages and assets
gulp.task('build', [
    'html',
    'images',
    'fonts',
    'css',
    'js'
]);

// the default task
gulp.task('default', ['build', 'serve']);

// watch the changes
gulp.task('watch', ['default'], () => {
    // html changes
    gulp.watch(html.watch, ['html', browserSync.reload]);

    // image changes
    gulp.watch(images.in, ['images']);

    // font changes
    gulp.watch(fonts.in, ['fonts']);

    // sass changes
    gulp.watch(css.watch, ['css']);

    // zurb foundation changes
    // gulp.watch(js.foundation.in, ['foundation']);

    // javascript changes
    gulp.watch(js.in.concat(
        js.dependencies,
        js.foundation.out + js.foundation.name
    ), ['js', browserSync.reload]);

    // the gulpfile.babel.js itself
    gulp.watch('gulpfile.babel.js', ['js', browserSync.reload]);
});

// internal functions
/**
 * get the relative path of an asset with the respect to the `dest` value
 * @param {string} absolutePath
 * @param {boolean} hasTrailingSlash
 * @returns {string}
 */
function getRelativePath(absolutePath = '', hasTrailingSlash  = false) {
    var ret = absolutePath.replace(new RegExp('\/$|' + dest, 'gi'), '');
    return hasTrailingSlash ? ret + '/' : ret;
}

/**
 * get the filename out of the given path
 * @param {string} path
 * @returns {string}
 */
function getFileName(path = '') {
    return path.split('/').pop();
}

/**
 * checks if the file exists
 * @param {string} path
 * @returns {boolean}
 */
function fileExists(path) {
    var exists = false;
    fs.access(path, fs.R_OK, (err) => {
        if (!err)
            exists = true;
    });
    return exists;
}