var fs = require('fs');

// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var eslint = require('gulp-eslint');
var sass = require('gulp-sass');
var bro = require('gulp-bro');
var stringify = require('stringify');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify-es').default;
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
var bourbon 	= require('bourbon').includePaths;
var neat		= require('bourbon-neat').includePaths;

var releaseFiles = [
  '**/*',
  '!.nyc_output/**/*',
  '!./{assets,assets/**}',
  '!./{bin,bin/**}',
  '!./{coverage,coverage/**}',
  '!dist/js/{maps,maps/**}',
  '!./{docs,docs/**}',
  '!./{node_modules,node_modules/**}',
  '!./{test,test/**}',
];

var versionBumps = {
  '--patch': 'patch',
  '--minor': 'minor',
  '--major': 'major',
};

// Lint Task
gulp.task('lint', function () {
  return gulp.src('js/*.js')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

// Compile Our Sass
gulp.task('sass', function () {
  return gulp.src('assets/styles/main.scss')
    .pipe(sass({
      includePaths: [bourbon, neat],
    }))
    .pipe(gulp.dest('dist/styles'));
});

// Concatenate & Minify JS
gulp.task('scripts', function () {
  return gulp.src('assets/js/backbone/app.js')
    .pipe(babel())
    .pipe(bro({ transform: stringify }))
    .pipe(rename('bundle.min.js'))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('dist/js'));
});

// Move additional resources
gulp.task('move', function (done) {
  gulp.src(['./assets/files/**'])
    .pipe(gulp.dest('dist/files'));
  gulp.src(['./assets/fonts/**'])
    .pipe(gulp.dest('dist/fonts'));
  gulp.src(['./assets/images/**'])
    .pipe(gulp.dest('dist/images'));
  gulp.src(['./assets/img/**'])
    .pipe(gulp.dest('dist/img'));
  gulp.src(['./assets/locales/**'])
    .pipe(gulp.dest('dist/locales'));
  gulp.src(['./assets/*.*'])
    .pipe(gulp.dest('dist'));
  gulp.src(['./assets/js/vendor/fontawesome-all.js'])
    .pipe(gulp.dest('dist/js'));
  done();
});

// Watch Files For Changes
gulp.task('watch', function () {
  gulp.watch('assets/js/backbone/**', gulp.series('lint', 'scripts'));
  gulp.watch('assets/js/utils/**', gulp.series('lint', 'scripts'));
  gulp.watch('assets/styles/**', gulp.series('sass'));
});

// Build task
gulp.task('build', gulp.series('lint', 'sass', 'scripts', 'move'));

// Bump package version number
gulp.task('bump', function () {
  var type = versionBumps[process.argv[3]];
  if(!type) {
    throw new Error('When calling `gulp bump` you must specify one of these options: ' + Object.keys(versionBumps));
  }
  var bump = require('gulp-bump');
  return gulp.src('./package.json')
    .pipe(bump({ type: type }))
    .pipe(gulp.dest('./'));
});

gulp.task('bump:patch', function () {
  var bump = require('gulp-bump');
  return gulp.src('./package.json')
    .pipe(bump({ type: 'patch' }))
    .pipe(gulp.dest('./'));
});

// Build an octopus release
gulp.task('create-release', function () {
  var octo = require('@octopusdeploy/gulp-octo');
  var pack = gulp.src(releaseFiles)
    .pipe(octo.pack('zip'));
  if(process.env.OctoHost && process.env.OctoKey) {
    return pack.pipe(octo.push({
      host: process.env.OctoHost,
      apiKey: process.env.OctoKey,
      replace: true,
    }));
  } else {
    return pack.pipe(gulp.dest('./bin'));
  }
});

gulp.task('publish', gulp.series('create-release', function (done) {
  const git = require('gulp-git');
  const octopusApi = require('octopus-deploy');
  const simpleCreateRelease = require('octopus-deploy/lib/commands/simple-create-release');
  const package = require('./package.json');
  octopusApi.init({
    host: process.env.OctoHost,
    apiKey: process.env.OctoKey,
  });
  git.exec({ args: 'describe --tags --abbrev=0', maxBuffer: Infinity }, (err, tag) => {
    if(err) { throw(err); }
    var logCMD = 'log ' + tag.replace(/\r?\n?/g, '') + '..@ --no-merges ' +
      '--pretty=format:"[%h](http://github.com/openopps/openopps-platform/commit/%H): %s%n"';
    git.exec({ args: logCMD, maxBuffer: Infinity }, (err, releaseNotes) => {
      if(err) { throw(err); }
      const releaseParams = {
        projectSlugOrId: 'openopps',
        version: package.version,
        packageVersion: package.version,
        releaseNotes: releaseNotes,
      };
      simpleCreateRelease(releaseParams).then((release) => {
        console.log('Octopus release created:', release);
        // Update current version in README
        var readme = fs.readFileSync('README.md');
        fs.writeFileSync('README.md', readme.toString().replace(/v\d+\.\d+.\d+/, 'v' + package.version));
        // Commit the new version
        git.exec({ args: 'add --all', maxBuffer: Infinity }, (err) => {
          if(err) { throw(err); }
          var commitMsg = 'commit -m "Create release package ' + package.version + '"';
          git.exec({ args: commitMsg, maxBuffer: Infinity }, (err) => {
            if(err) { throw(err); }
            git.tag('v' + package.version, '', function (err) {
              if (err) throw err;
              done();
            });
          });
        });
      }, (error) => {
        console.log('Octopus release creation failed!', error);
        done();
      });
    });
  });
}));

//Default task
gulp.task('default', gulp.series('lint', 'sass', 'scripts', 'move', 'watch'));
