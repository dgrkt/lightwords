////////////////////////////////////////
// GULPFILE.JS
////////////////////////////////////////

////////////////////////////////////////
// CONFIGURATION

global.config = {
  // Server config

  // browsersyncProxyURL: 'localhost', // put your wordpress dev URL here
  browsersyncProxyURL: 'localhost:8000', // NAT with docker-compose
  serverport: 3000,
  openBrowser: false,
  openBrowsers: ['google chrome', 'firefox'],

  // Directory names

  path: {
    src: 'src/',
    dist: 'dist/',
    css: 'css/',
    scss: 'scss/',
    js: 'js/',
    img: 'img/',
    fonts: 'fonts/',
    favicons: 'img/favicon/'
  },

  // Order-dependant javascript files static build

  filesJs: [
    // Vendor
    'node_modules/select2/dist/js/select2.js',

    'node_modules/jarallax/dist/jarallax.min.js',
    'node_modules/jarallax/dist/jarallax-video.min.js',
    'node_modules/jarallax/dist/jarallax-element.min.js',

    'src/js/lib/modal.js', // Borrowed from Bootstrap

    // Lib
    'src/js/lib/configure.js',
    'src/js/lib/debounce-throttle.js',
    'src/js/lib/toggler.js',
    'src/js/lib/dropdown-menu.js',
    'src/js/lib/mobile-panels.js',
    'src/js/lib/scroller.js',
    'src/js/lib/ripple.js',
    'src/js/lib/page-transitions.js',
    'src/js/lib/search.js',
    'src/js/lib/select2.js',
    'src/js/lib/on-scroll.js',
    'src/js/lib/image-wall.js',
    'src/js/lib/parallax-hero.js',

    'src/js/main.js'
  ]
}

// COMPOSITE PATHS

// Source paths
config.pathJs = [config.path.src + config.path.js + '**/*.js']
config.pathScss = [config.path.src + config.path.scss + '**/*.scss']
config.pathSpritesSVG = [config.path.src + config.path.img + 'sprites/*.svg']
config.pathImages = [
  config.path.src + config.path.img + '*.*',
  '!' + config.pathSpritesSVG
]
config.pathFavicons = config.path.src + config.path.favicons + '*.*'
config.pathHtml = [config.path.src + '*.html', config.pathStyleguide + '*.html']
config.pathTemplates = ['*.php', 'lib/**/*.php', 'templates/**/*.twig', 'config.json']

// Destination
config.pathJsDest = config.path.dist + config.path.js
config.pathCssDest = config.path.dist + config.path.css
config.pathFontsDest = config.path.dist + config.path.fonts
config.pathImagesDest = config.path.dist + config.path.img
config.pathFaviconsDest = config.path.dist + config.path.favicons

// Clean
config.pathClean = [config.path.dist]

////////////////////////////////////////
// MODULES

var gulp = require('gulp'),
  // auto-load all gulp plugins
  plugins = require('gulp-load-plugins')(),
  // non-gulp tools
  browserSync = require('browser-sync'),
  reload = browserSync.reload,
  del = require('del'),
  fs = require('node-fs'),
  vinylPaths = require('vinyl-paths'),
  autoprefixer = require('autoprefixer'),
  runSequence = require('run-sequence'),
  colors = require('colors'),
  beep = require('beepbeep')

require('gulp-stats')(gulp)

////////////////////////////////////////
// ERROR HANDLING

var onError = function(e) {
  beep() // Ubuntu MATE needs love
  if (e) {
    console.log(e)
    // LibSass
    if (e.plugin) console.log('ERROR'.bold.red + ' - ' + e.plugin.bold.yellow)
    if (e.file) console.log('Error in: ' + e.file)
    if (e.line && e.column)
      console.log('Error at: line ' + e.line + ' - column ' + e.column)
    //		if (e.messageFormatted) console.log(e.messageFormatted.red);
    // Babel
    if (e.name) console.log((e.name + ' ' + e.message).bold.red)
    if (e.codeFrame) console.log(e.codeFrame)

    // ommit this and watch task will stop working!
    this.emit('end')
  }
}

////////////////////////////////////////
// INTERNAL TASKS

// UTILS

// Clean

gulp.task('clean', function() {
  return gulp.src(config.pathClean).pipe(vinylPaths(del))
})

// Copy

gulp.task('copy', [/*'copy-fonts', */'copy-favicons'])

gulp.task('copy-fonts', function() {
  return gulp
    .src(['node_modules/font-awesome/fonts/*'])
    .pipe(gulp.dest(config.pathFontsDest))
})

gulp.task('copy-favicons', function() {
  return gulp
    .src([config.pathFavicons])
    .pipe(gulp.dest(config.pathFaviconsDest))
})

// IMAGES

gulp.task('images', function() {
  return (
    gulp
      .src(config.pathImages)
      .pipe(plugins.newer(config.pathImagesDest))

      // prod
      .pipe(
        plugins.imagemin({
          progressive: true, // jpeg
          interlaced: true, // gif
          multipass: true // svg
          // svgoPlugins: [{removeViewBox: false}],
          // use: [pngquant()]
        })
      )
      .pipe(gulp.dest(config.pathImagesDest))
      .pipe(reload({ stream: true }))
  )
})

// SVG sprites

gulp.task('sprites', function() {
  return (
    gulp
      .src(config.pathSpritesSVG)

      // prod
      .pipe(
        plugins.svgSprite({
          log: null,
          mode: { inline: true, symbol: true }
        })
      )
      // .pipe(gulp.dest(config.path.src + config.path.img))
      .pipe(plugins.rename('sprite.symbol.svg.twig'))
      .pipe(gulp.dest(config.pathImagesDest))
      .pipe(reload({ stream: true }))
  )
})

gulp.task('sprites-reload', ['sprites'], reload)

// STYLES

gulp.task('styles', function() {
  return (
    gulp
      .src([config.path.src + config.path.scss + 'main.scss'])
      .pipe(plugins.plumber(onError))
      // .pipe(plugins.scssLint({"config": "scsslint.yml"}))
      .pipe(plugins.sourcemaps.init())
      .pipe(plugins.sass({ outputStyle: 'expanded' }))
      .pipe(
        plugins.postcss([
          autoprefixer({
            browsers: ['last 2 version']
          })
        ])
      )
      .pipe(plugins.sourcemaps.write({ sourceRoot: '.' }))
      .pipe(plugins.rename('style.css'))
      .pipe(gulp.dest(config.pathCssDest))
      .pipe(reload({ stream: true }))
  )
})

// SCRIPTS

gulp.task('scripts', function() {
  /*	ADD THIS TO package.json TO ENABLE ES6
			(and gain 130+ megs of node_modules/)

		"babel-preset-es2015": "^6.3.13",
		"eslint-config-standard": "^4.4.0",
		"eslint-plugin-standard": "^1.3.1",
		"gulp-babel": "^6.1.1",
		"gulp-eslint": "^1.1.1",
	*/
  return (
    gulp
      .src(config.filesJs)
      .pipe(plugins.plumber(onError))
      // .pipe(plugins.eslint())
      // .pipe(plugins.eslint.format())
      .pipe(plugins.sourcemaps.init())
      // .pipe(plugins.babel({
      //       presets: ["es2015"],
      //       compact: false
      //     }))
      .pipe(plugins.concat('main.js'))
      .pipe(plugins.sourcemaps.write({ sourceRoot: '.' }))

      // prod
      // .pipe(plugins.rename({suffix: ".min"}))
      .pipe(plugins.uglify({ outSourceMaps: true }))
      .pipe(gulp.dest(config.pathJsDest))
      .pipe(reload({ stream: true }))
  )
})

// PHP / TEMPLATES

gulp.task('templates', function() {
  return (
    gulp
      .src(config.pathTemplates)
      // Do nothing by now, just reload the page
      .pipe(reload({ stream: true }))
  )
})

// SERVER

gulp.task('serve', function() {
  browserSync({
    proxy: config.browsersyncProxyURL,
    // serveStatic: ["app/static"],
    files: [
      // '{lib,templates}/**/*.php', '*.php',
      '*.css',
      '**/*.php',
      // dest + '/**',
      '!**/*.map'
    ],
    open: config.openBrowser,
    browser: config.openBrowsers
  })
})

// WATCH

gulp.task('watch', function() {
  gulp.watch(config.pathJs, ['scripts'])
  gulp.watch(config.pathScss, ['styles'])
  gulp.watch(config.pathTemplates, ['templates'])
  gulp.watch(config.pathImages, ['images'])
  gulp.watch(config.pathSpritesSVG, ['sprites-reload'])
})

////////////////////////////////////////
// USER TASKS

gulp.task('compile', ['scripts', 'styles', 'templates'])
gulp.task('graphics', ['images', 'sprites'])
gulp.task('swatch', ['serve', 'watch'])

gulp.task('build', function() {
  runSequence('clean', ['copy', 'compile', 'graphics'])
})

gulp.task('default', ['swatch'])
