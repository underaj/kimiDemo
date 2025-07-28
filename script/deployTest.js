// #!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs-extra');
const { NodeSSH }= require('node-ssh')
const { spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const ssh = new NodeSSH();

const appName = 'toby-kimi-demo';
const projectFolderName = 'kimidemo';

const onFailed = (message, details = '') => {
  console.error(`❌ ${message}`);
  if (details) {
    console.error(details);
  }
  process.exit(1);
};

const pm2Config = {
  apps: [
    {
      name: appName,
      script: "./server.js",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      env_production: {
        "NODE_ENV": "production",
        "APP_ENV": "staging",
      }
    }
  ]
};

const buildPromise = () => new Promise((resolve, reject) => {
  const child = spawn(
    'yarn',
    ['build'],
    { cwd: path.resolve(__dirname, `../`) }
  );

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.on('error', (data) => {
    console.error(`error in building`);
    console.error(data);
    reject(data);
  });

  child.on('exit', (code) => {
    if (code === 0) {
      resolve('build completed successfully');
    } else {
      reject(new Error(`Build failed with exit code: ${code}`));
    }
  });
});

const buildServer = async () => {
  try {
    await buildPromise();
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
  
  await ssh.connect({
    host: process.env.DEPLOY_SERVER,
    username: 'root',
    privateKeyPath: process.env.PRIVATE_KEY_LOCATION,
  });

  try {
    const newPm2Config = { ...pm2Config};
    const env = dotenv.parse(
      fs.readFileSync(path.resolve(__dirname, `../.env.production`))
    );
    let packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json')));

    const updateEnv = {
      ...env,
      webVersion: packageJson.version,
    };

    newPm2Config.apps[0].env_production = updateEnv;

    fs.writeJsonSync(path.resolve(__dirname, '../process.json'), newPm2Config, {
      spaces: 2,
    });

    let result;
    
    try {
      result = await ssh.execCommand('mkdir build', { cwd: `/${projectFolderName}` });
      if (result.stderr) {
        console.error('error in making build folder');
        console.error(result.stderr);
      }
    } catch (error) {
      console.log('has folder or connection error');
    }

    result = await ssh.execCommand('ls', { cwd: `/${projectFolderName}` });

    if (result.stderr) {
      console.error(result.stderr);
    }
    console.log(result);
    console.log('prepare put files');

    const failed = [];
    const successful = [];

    const staticSourcePath = path.resolve(__dirname, '../.next/static/');
    const staticDestPath = path.resolve(__dirname, '../.next/standalone/.next/static/');

    try {
      await fs.copy(staticSourcePath, staticDestPath);
      console.log('✅ Static files copied to standalone directory successfully!');
    } catch (error) {
      console.error('❌ Failed to copy static files:', error.message);
      process.exit(1);
    }
    const standaloneResult = await ssh.putDirectory(
      path.resolve(__dirname, '../.next/standalone'),
      `/${projectFolderName}`,
      {
        recursive: true,
        concurrency: 1,
        validate(itemPath) {
          const baseName = path.basename(itemPath);
          return baseName !== 'node_modules';
        },
        tick(localPath, remotePath, error) {
          if (error) {
            failed.push(localPath);
          } else {
            successful.push(localPath);
          }
        },
      }
    );

    console.log('the directory transfer was', standaloneResult ? 'successful' : 'unsuccessful');

    if (failed.length > 0) {
      onFailed('failed transfers', failed.join(', '));
    }

    const processPath = path.resolve(__dirname, '../process.json');

    await ssh.putFile(processPath, `/${projectFolderName}/process.json`, null, { concurrency: 1 });
    console.log('finish uploaded ', processPath);

    const lockFilePath = path.resolve(__dirname, '../yarn.lock');
    console.log('finish uploading ', lockFilePath);
    await ssh.putFile(lockFilePath, `/${projectFolderName}/yarn.lock`, null, { concurrency: 1 });
    console.log('finish uploaded ', lockFilePath);

    const publicResult = await ssh.putDirectory(
      path.resolve(__dirname, '../public'),
      `/${projectFolderName}/public`,
      {
        recursive: true,
        concurrency: 1,
        validate(itemPath) {
          const baseName = path.basename(itemPath);
          return (
            baseName.substr(0, 1) !== '.' && baseName !== 'node_modules' // do not allow dot files
          ); // do not allow node_modules
        },
        tick(localPath, remotePath, error) {
          if (error) {
            failed.push(localPath);
          } else {
            successful.push(localPath);
          }
        },
      }
    );

    console.log('the directory transfer was', publicResult ? 'successful' : 'unsuccessful');
    if (failed.length > 0) {
      onFailed('failed transfers', failed.join(', '));
    }

    console.log('prepare to install');
    result = await ssh.execCommand('yarn install --production --frozen-lockfile', {
      cwd: `/${projectFolderName}`,
      onStdout(chunk) {
        console.log(chunk.toString('utf8'));
      },
      onStderr(chunk) {
        console.log(chunk.toString('utf8'));
      },
    });
    console.log('done yarn install');

    result = await ssh.execCommand(
      `pm2 restart process.json --only ${appName} --update-env --env production`,
      {
        cwd: `/${projectFolderName}`,
      }
    );
    if (result.stderr) {
      onFailed(result.stderr);
    }

    result = await ssh.execCommand(`pm2 reset ${appName}`, {
      cwd: `/${projectFolderName}`,
    });

    if (result.stderr) {
      onFailed(result.stderr);
    }

    result = await ssh.execCommand('pm2 list', {
      cwd: `/${projectFolderName}`,
    });
    console.log(result.stdout);

    if (result.stderr) {
      console.error('error', result.stderr);
    }
    console.log('complete deploying production');
  } catch (error) {
    console.error(error);
  } finally {
    ssh.dispose();
  }
};

buildServer();
