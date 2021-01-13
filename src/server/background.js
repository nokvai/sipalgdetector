// background.js

'use strict';

const os = require('os');
const path = require('path');
const {app, BrowserWindow, ipcMain} = require('electron');
const {setupMenu} = require('./sipAlgDetectorMenu');
const {getIPv4Addresses} = require('../sipAlgClient/udpTransport');
const TestClient = require('../sipAlgClient/testClient');

//////////////////////////////////////////////////////
// background stuff

console.log(`Starting app with node.js ${process.version} and electron ${process.versions['electron']} `);

//////////////////////////////////////////////////////
// Electron specific stuff

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    //if (process.platform != 'darwin') {
    app.quit();
    //}
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
    console.log("starting the app...");

    let height = 620;
    if (os.platform() === 'win32') {
        height += 20;
    }

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 960,
        height,
        backgroundColor: '#ccc',
        title: "SIP ALG Detector",
        frame: true,
        //titleBarStyle: 'hidden-inset',
        icon: (process.platform === 'darwin') ?
            path.join('file://', __dirname, '/../../public/img/sipalg.icns') :
            path.join('file://', __dirname, '/../../public/img/sipalg.ico'),
        show: false
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });

    // and load the index.html of the app.
    mainWindow.loadURL(path.join('file://', __dirname, '/../../public/panel.html'));

    // Open the DevTools.
    //mainWindow.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

    mainWindow.focus();
    mainWindow.webContents.focus();

    // Set up the menu
    setupMenu(mainWindow);
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
