const os = require('node:os');
const path = require('node:path');

// Some Windows/Node combinations report ENOMEM from uv_os_get_passwd even
// when memory is available. Drizzle reads this metadata for its CLI paths.
try {
  os.userInfo();
} catch (error) {
  if (error?.code !== 'ERR_SYSTEM_ERROR' || error?.info?.code !== 'ENOMEM') {
    throw error;
  }

  os.userInfo = () => ({
    uid: -1,
    gid: -1,
    username: process.env.USERNAME || 'developer',
    homedir: process.env.USERPROFILE || process.cwd(),
    shell: null,
  });
}

const drizzleEntry = require.resolve('drizzle-kit');
require(path.join(path.dirname(drizzleEntry), 'bin.cjs'));
