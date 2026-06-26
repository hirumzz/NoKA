const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'node_modules', 'sails-postgresql', 'lib', 'adapter.js');

if (fs.existsSync(targetFile)) {
  console.log('Patching sails-postgresql/lib/adapter.js...');
  let content = fs.readFileSync(targetFile, 'utf8');

  // Replace 'r.consrc, with 'pg_get_constraintdef(r.oid) as consrc,
  content = content.replace(/'r\.consrc,\s*/g, "'pg_get_constraintdef(r.oid) as consrc, ");
  
  // Replace d.adsrc as \"Default\" with pg_get_expr(d.adbin, d.adrelid) as \"Default\"
  content = content.replace(/d\.adsrc as \\"Default\\"/g, 'pg_get_expr(d.adbin, d.adrelid) as \\"Default\\"');

  // Define var pools = {};
  if (content.indexOf('var pools = {};') === -1) {
    content = content.replace('var connections = {};', 'var connections = {};\n  var pools = {};');
  }

  // Replace pg.connect with pool.connect
  const oldConnect = `    // Grab a client instance from the client pool
    pg.connect(connectionConfig, function(err, client, done) {
      after(err, client, done);
    });`;
  
  const newConnect = `    // Grab a client instance from the client pool (patched to use pg-pool for pg v7+)
    var poolKey = connectionName;
    var pool = pools[poolKey];
    if (!pool) {
      var poolConfig = typeof connectionConfig === 'string' ? { connectionString: connectionConfig } : connectionConfig;
      pool = new pg.Pool(poolConfig);
      pools[poolKey] = pool;
    }
    pool.connect(function(err, client, done) {
      after(err, client, done);
    });`;

  if (content.indexOf('pg.Pool(poolConfig)') === -1) {
    content = content.replace(oldConnect, newConnect);
  }

  // Update teardown function to clean up pools
  const oldTeardown = `      if (conn === null) {
        connections = {};
        return cb();
      }
      if(!connections[conn]) {
        return cb();
      }

      delete connections[conn];
      cb();`;

  const newTeardown = `      if (conn === null) {
        connections = {};
        _.each(pools, function(p) { try { p.end(); } catch(e){} });
        pools = {};
        return cb();
      }
      if(!connections[conn]) {
        return cb();
      }

      delete connections[conn];
      if(pools[conn]) {
        try { pools[conn].end(); } catch(e){}
        delete pools[conn];
      }
      cb();`;

  if (content.indexOf('pools[conn].end()') === -1) {
    content = content.replace(oldTeardown, newTeardown);
  }

  // Patch URL format logic to not append defaults that override the URL hostname
  const oldUrlFormat = `    if(_.has(connectionConfig, 'url')) {
      var connectionUrl = url.parse(connectionConfig.url);
      connectionUrl.query = _.omit(connectionConfig, 'url');
      connectionConfig = url.format(connectionUrl);
    }`;

  const newUrlFormat = `    if(_.has(connectionConfig, 'url')) {
      connectionConfig = connectionConfig.url;
    }`;

  if (content.indexOf("connectionConfig = connectionConfig.url;") === -1) {
    content = content.replace(oldUrlFormat, newUrlFormat);
  }

  if (content.indexOf("pg_get_constraintdef(r.oid) as consrc") !== -1) {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('Patch applied successfully!');
  } else {
    console.error('Failed to find target patterns in adapter.js!');
    process.exit(1);
  }
} else {
  console.log('sails-postgresql not found at', targetFile);
}
