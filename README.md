# migrate-mongodb-persistence

Mixin for [`node-migrate`](https://npm.im/migrate) CLI that will persist current migration state to a MongoDB collection instead of a flat file.

This is useful when you have several transient application servers (and filesystems) sharing a single database. You only need to migrate once per database; not once per filesystem.

This makes `migrate` behave more like [Django South](https://south.readthedocs.org) or [Ruby on Rails ActiveRecord Migrations](http://edgeguides.rubyonrails.org/active_record_migrations.html).

## Usage

1. Make sure you're using a branch of migrate that supports mixins. `npm install --save-dev git://github.com/gobengo/node-migrate#012015_mixins`.
2. Create a new module like `tools/store-migration-state-in-mongo.js`. Something like:

    ```javascript
    var mongoDbConnectionString = 'localhost'; // or get from your config file
    var migrationStateCollectionName = 'migration_state'; // or whatever

    module.exports = require('migrate-mongo-persistence')(
        mongoDbConnectionString, migrationStateCollectionName);
    ```

3. When running the migrate cli, use your mixin like `./node_modules/.bin/migrate --use tools/store-migration-state-in-mongo.js <migrateCommand>`
