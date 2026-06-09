const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'node_modules', 'sails-postgresql', 'lib', 'adapter.js');

if (fs.existsSync(targetFile)) {
  console.log('Patching sails-postgresql/lib/adapter.js to support PostgreSQL 12+...');
  let content = fs.readFileSync(targetFile, 'utf8');

  // Replace 'r.consrc, with 'pg_get_constraintdef(r.oid) as consrc,
  content = content.replace(/'r\.consrc,\s*/g, "'pg_get_constraintdef(r.oid) as consrc, ");
  
  // Replace d.adsrc as \"Default\" with pg_get_expr(d.adbin, d.adrelid) as \"Default\"
  content = content.replace(/d\.adsrc as \\"Default\\"/g, 'pg_get_expr(d.adbin, d.adrelid) as \\"Default\\"');

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
