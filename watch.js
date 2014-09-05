var nforce = require('nforce'),
  tooling = require('nforce-tooling')(nforce),
  Q = require("q"),
  fs = require('fs'),
  watch = require('watch');

var sfuser = process.env.SFUSER;
var sfpass = process.env.SFPASS;

var org = nforce.createConnection({
  clientId: process.env.CLIENTID,
  clientSecret: process.env.CLIENTSECRET,
  redirectUri: 'http://localhost:3000/oauth/_callback',
  mode: 'single',
  plugins: ['tooling']
});

org.authenticate({ username: sfuser, password: sfpass}, function(err, resp){
  if(!err) {
    console.log('Connected to Salesforce. Watching for new files...');

    watch.createMonitor('/Users/jeff/Documents/projects/git/df14-tooling-demo/watch', function (monitor) {
      monitor.on("created", function (f, stat) {
        if (monitor.files[f] === undefined) {

            deploy(f)
              .then(function(results) {
                console.log(results);
              });

        }
      });
    });
  } else {
    console.log('Error connecting to Salesforce: ' + err.message);
  }
});

function deploy(f) {

  console.log('Deploying ' + f);
  var deferred = Q.defer();
  var tokens = f.split('/');
  var className = tokens[tokens.length-1].substring(0,tokens[tokens.length-1].indexOf('.'));

  Q.all([
    getApexCode(f)
  ]).then(function(classes) {
    Q.all([
      createApexClassInSalesforce({ name: className, body: classes[0] })
    ]).then(function(results) {
      deferred.resolve("Deployed ApexClass to Salesforce with ID " + results[0].id);
    });
  });  

  function getApexCode(file) {
    var deferred = Q.defer();
    fs.readFile(file, 'utf8', function (err, contents) {
      if (err) { deferred.reject(err); }
      if (!err) { deferred.resolve(contents); }
    });
    return deferred.promise;
  }

  function createApexClassInSalesforce(obj) {
    var deferred = Q.defer();
    org.tooling.insert({type: 'ApexClass', object: obj}, function(err, resp) {
      if (err) {
        console.log(err);
        deferred.reject(err);
      }
      if (!err) {
        deferred.resolve(resp);
      }
    });
    return deferred.promise;
  }

  return deferred.promise;
}

