var assert = require('assert');
var extend = require('util-extend');
var MongoClient = require('mongodb').MongoClient;
var Promise = require('promise');

/**
 * Create a node-migrate mixin that will persist migration state to a MongoDB
 * collection.
 * @param dbConnectionString {string} http://docs.mongodb.org/manual/reference/connection-string/
 * @param migrationStateCollectionname {string} Mongo Collection in the db in which
 *   the migration state should be stored
 */
module.exports = function createMongoMigrateMixin(dbConnectionString, migrationStateCollectionName) {
  assert(dbConnectionString);
  assert(migrationStateCollectionName);
  // Return a promise of a connected mongo db
  function openDb() {
    return new Promise(function (resolve, reject) {
      var MongoClient = require('mongodb').MongoClient;
      MongoClient.connect(dbConnectionString, function (err, db) {
        if (err) return reject(err);
        resolve(db);
      })
    });
  }
  // node-migrate mixins are functions that act on require('migrate');
  return function (migrate) {
    /**
     * Override .load and .save to persist to mongo instead of a file
     */
    extend(migrate.set, {
      load: function (cb) {
        this.emit('load');
        return openDb()
        .then(function (db) {
          var migrationStateCollection = db.collection(migrationStateCollectionName);
          return new Promise(function (resolve, reject) {
            migrationStateCollection.findOne(function (err) {
              db.close();
              if (err) return reject(err);
              return resolve.apply(this, [].slice.call(arguments, 1));
            });
          });
        })
        .then(function (stateRecord) {
          if ( ! stateRecord) {
            // migrate handles this gracefully as if there is no current state
            return cb({
              code: 'ENOENT'
            });
          }
          cb(null, stateRecord.state);
        }, cb);
      },
      // should emit save when done
      save: function () {
        var id = 0;
        var stateRecord = {
          id: id,
          state: this
        };
        var self = this;
        return openDb()
        .then(function (db) {
          var migrationStateCollection = db.collection(migrationStateCollectionName);
          var query = { id: id };
          var options = { upsert: true };
          return new Promise(function (resolve, reject) {
            migrationStateCollection.update(query, stateRecord, options, function (err) {
              db.close();
              if (err) return reject(err);
              return resolve.apply(this, [].slice.call(arguments, 1));          
            })
          })
        })
        .then(function (updatedCount) {
          self.emit('save');
        }, function (err) {
          self.emit('error', err);
        });
      }
    })
  }
};
