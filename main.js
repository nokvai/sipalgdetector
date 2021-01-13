import electron from 'electron';
import path from 'path';
import url from 'url';
import 'babel-polyfill';

const os = require('os');
// const path = require('path');
const { ipcMain} = electron;
const {setupMenu} = require('./server/sipAlgDetectorMenu');
const {getIPv4Addresses} = require('./sipAlgClient/udpTransport');
const TestClient = require('./sipAlgClient/testClient');



const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

let mainWindow;

const createWindow = () => {

  if (os.platform() === 'win32') {
  
  }

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    icon: (process.platform === 'darwin') ?
    path.join('file://', __dirname, 'MonsterVoip.icns') :
    path.join('file://', __dirname, 'MonsterVoip.ico'),
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  //mainWindow.webContents.openDevTools()
 
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.focus();
  mainWindow.webContents.focus();

  // Set up the menu
  setupMenu(mainWindow);

};

app.on('ready', createWindow);
 
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});


//////////////////////////////////////////////////////
// IPC (Inter Process Communication) with the main window

ipcMain.on('getIPv4Addresses', (event) => {
  const ips = getIPv4Addresses();
  mainWindow.webContents.send('getIPv4Addresses', ips);
});

let testClient = null;

ipcMain.on('startTest', (event, selectedIp) => {
  console.log("Starting test with local IP:", selectedIp);

  testClient = new TestClient(selectedIp, 0, (results) => {
      mainWindow.webContents.send("testResults", results);
  });

  testClient.start();

  mainWindow.webContents.send("testId", testClient.testId);
});

ipcMain.on('startNatSessionTimeoutTest', (event, props) => {
  console.log("Starting test with local IP:", props.selectedIp, "timeout:", props.timeout);

  testClient = new TestClient(props.selectedIp, props.timeout, (results) => {
      mainWindow.webContents.send("testResults", results);
  });

  testClient.start();

  mainWindow.webContents.send("testId", testClient.testId);
});

ipcMain.on('stopTest', (event) => {
  if (testClient) {
      testClient.stop();
      testClient = null;
  }
});