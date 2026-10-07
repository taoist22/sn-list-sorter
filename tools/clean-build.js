const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || process.cwd());
for (const directory of ['generated', 'outputs']) {
  fs.rmSync(path.join(root, 'build', directory), {
    recursive: true,
    force: true,
  });
}
