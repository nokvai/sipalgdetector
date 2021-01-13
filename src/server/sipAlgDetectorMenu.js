// sipAlgDetectorMenu.js

const {app, Menu, dialog, nativeImage} = require('electron');
const {version} = require('../../package.json');
const os = require('os');

function setupMenu(browserWindow) {

    //var name = require('app').getName();
    const name = ' Monster VoIP SIP ALG Detector';

    function about(browserWindow) {
        let details = '';
        details += "Tech Support: \n\t\t" + 'Joseph Remus Avilla, Joselito Pacaldo and Jet Mendiola' + "\n";
        // \"Electron: \t" + process.versions['electron'] + "\n";
        // details += "Node.js: \t" + process.version + "\n";
        // details += "Chrome: \t" + process.versions['chrome'] + "\n";
        // details += "V8: \t\t" + process.versions['v8'] + "\n";
        

        console.log(process.versions);

        dialog.showMessageBox(browserWindow, {
            type: 'info', //Windows sets different icons depending on this (if icon is unset)
            icon: nativeImage.createFromPath('./src/MonsterVoip.png'), //ignored on Windows
            title: 'About' + name, //this isn't shown on MacOS, but is on Windows. If blank, it's your app name on Windows
            message: name + " " + version,
            detail: details,
            buttons: ['Close'], //can pass multiple buttons in here and then get the index of the clicked on in the callback
            defaultId: 0
        }, (clickedIndex) => {
            console.log(clickedIndex);
        });
    }

    const template = [
        {
            label: 'Edit',
            submenu: [
                {role: 'copy'},
                {role: 'selectall'}
            ]
        },
        {
            label: 'View',
            submenu: [
                {role: 'reload'},
                {role: 'forcereload'},
                {role: 'toggledevtools'},
                {type: 'separator'},
                {role: 'resetzoom'},
                {role: 'zoomin'},
                {role: 'zoomout'},
                {type: 'separator'},
                {role: 'togglefullscreen'}
            ]
            /*submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: function(item, focusedWindow) {
                        if (focusedWindow)
                            focusedWindow.reload();
                    }
                },
                {
                    label: 'Toggle Full Screen',
                    accelerator: (function() {
                        if (process.platform === 'darwin')
                            return 'Ctrl+Command+F';
                        else
                            return 'F11';
                    })(),
                    click: function(item, focusedWindow) {
                        if (focusedWindow)
                            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                    }
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: (function() {
                        if (process.platform === 'darwin')
                            return 'Alt+Command+I';
                        else
                            return 'Ctrl+Shift+I';
                    })(),
                    click: function(item, focusedWindow) {
                        if (focusedWindow)
                            focusedWindow.toggleDevTools();
                    }
                },
            ]*/
        },
        {
            label: 'Window',
            role: 'window',
            submenu: [
                {
                    label: 'Minimize',
                    accelerator: 'CmdOrCtrl+M',
                    role: 'minimize'
                },
                {
                    label: 'Close',
                    accelerator: 'CmdOrCtrl+W',
                    role: 'close'
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Bring All to Front',
                    role: 'front'
                }
            ]
        },
        /*{
            label: 'Help',
            role: 'help',
            submenu: [
                {
                    label: 'Learn More',
                    click: function() { require('shell').openExternal('http://electron.atom.io') }
                },
            ]
        },*/
    ];

    if (process.platform === 'darwin') {
        template.unshift({
            label: name,
            submenu: [
                {
                    label: 'About ' + name,
                    click: () => about(browserWindow)
                },
                {
                    type: 'separator'
                },
                {
                    //label: 'Services',
                    role: 'services',
                    submenu: []
                },
                {
                    type: 'separator'
                },
                {
                    //label: 'Hide ' + name,
                    //accelerator: 'Command+H',
                    role: 'hide'
                },
                {
                    //label: 'Hide Others',
                    //accelerator: 'Command+Shift+H',
                    role: 'hideothers'
                },
                {
                    //label: 'Show All',
                    role: 'unhide'
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Quit ' + name,
                    accelerator: 'Command+Q',
                    click: function () {
                        app.quit();
                    }
                },
            ]
        });
    } else {
        template.unshift({
            label: 'File',
            submenu: [
                {
                    label: 'About ' + name,
                    click: () => about(browserWindow)
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Exit',
                    accelerator: 'Alt+F4',
                    click: function () {
                        app.quit();
                    }
                },
            ]
        });
    }

    console.log("Setup menu...");

    const sipAlgDetectorMenu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(sipAlgDetectorMenu);
}

module.exports = {setupMenu};