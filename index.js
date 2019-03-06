const SlackBot = require('slackbots');
const axios = require('axios');
const firebase = require('firebase');

const commands = [
    [' challenge', challengeHandler, '(show the current challengee)'],
    [' add', addHandler, '@user-tag', '(add new user to challenge)'],
    [' remove', removeHandler, '@user-tag', '(remove user from the challenge)'],
    [' show pendings', showPendingsHandler, '(show the ones who are pending to challenge)'],
    [' next', nextHandler, '(move the challenge to the next user)', '*just the challenged user can excecute it'],
    [' skip', skipHandler, '(add the current user to a skipped list and move challenge to the next one)'],
    [' unskip all', unskipHandler, '(reset skipped list to pending again)'],
    [' commands', commandsHandler, '(show list of commands)'],
]
let stacks = {
    pending: [],
    committed: [],
    skipped: []
}
const slackconf = require('./slack-config.json');
const bot = new SlackBot(slackconf);

const config = require('./firebase-config.json');
firebase.initializeApp(config);
const db = firebase.firestore();

// Start Handler
bot.on('start', (data) => {
    const params = {
        icon_emoji: ':sunglasses:'
    };

    firebase.auth().signInAnonymously().catch(err => {
        console.error(err);
    })

    bot.getUsers().then(data => {
        console.log(data);
        data.members.filter(a => !a.is_bot).forEach(member => {
            bot.postMessageToUser(member.name, 'Get Ready To Challenge!', params);
        })
    });
});

// Error Handler
bot.on('error', console.log);

// Bottle Challenge Handler
bot.on('message', data => {
    if (data.type !== 'message' || data.bot_id) return;
    // console.log(data);
    const { team, channel, user } = data;
    // bot.postMessage(channel, `Challenger is ready!!!`);
    const docRef = db.collection(`${team}-team`).doc(`${channel}-channel`);
    getStacks(docRef)
    .then(({pending, committed, skipped}) => {
        stacks = {
            pending,
            committed,
            skipped
        };
        if (skipped.length) {
            bot.postMessage(channel, `Users skipped:\n${[...skipped].reverse().join('\n')}`)
        }
        handleMessage({stacks, docRef, channel, user, message: data.text});
    });
});

// Handle Message
function handleMessage({stacks, docRef, channel, user, message}) {
    commands.some(([command, func]) => {
        const includes = (message || '').includes(command);
        if (includes) {
            func({stacks, docRef, channel, user, message: message.split(command)[1]});
        }
        return includes;
    })
}

// show pendings
function showPendingsHandler({stacks, channel}) {
    bot.postMessage(
        channel,
        `Pendings to change the bottle:\n${[...stacks.pending].reverse().join('\n')}`
    );
}

// Challenge Handler
function challengeHandler({stacks, docRef, channel}) {
    const { pending } = stacks;
    if(pending.length === 0) resetPending({stacks, docRef, channel});
    const current = getCurrent({stacks});

    const params = {
        icon_emoji: ':eyes:'
    };

    if (current) {
        bot.postMessage(channel, `Challenge ${current} to change the bottle!`, params);
    } else {
        bot.postMessage(channel, `There is no one to challenge!`, params);
    }
}

// Add Challengee Handler
function addHandler({stacks, docRef, channel, message}) {
    const { pending, committed } = stacks;
    const toAddUsers = message.trim().split(' ');
    toAddUsers.forEach(toAdd => {
        console.log(toAdd, validUserTag(toAdd));
        const validTag = validUserTag(toAdd);
        onlyUserTag(!validTag);
        if (!validTag)return;

        if(pending.filter(t => t === toAdd).length > 0 || committed.filter(t => t === toAdd).length > 0){
            bot.postMessage(channel, `${toAdd} is already added.`);
        } else {
            pending.unshift(toAdd);
            setStacks(docRef, stacks)
            .then(() => {
                bot.postMessage(channel, `${toAdd} successfully added.`);
            })
            .catch(err => {
                bot.postMessage(channel, `${toAdd} has not been added (error): ${err}.`);
            });
        }
    });

}

function removeHandler({stacks, docRef, channel, message}) {
    const { pending, committed, skipped } = stacks;
    const [toRemove] = message.trim().split(' ');
    console.log(toRemove, validUserTag(toRemove));
    if (!validUserTag(toRemove)) {
        bot.postMessage(channel, 'Just @user-tag is valid.')
        return;
    }
    const existOnPendings = pending.filter(t => t === toRemove);
    const existOnCommitted = committed.filter(t => t === toRemove);
    const existOnSkipped = skipped.filter(t => t === toRemove);
    if(existOnPendings.length > 0 || existOnCommitted.length > 0){
        setStacks(docRef, {
            pending: pending.filter(t => t !== toRemove),
            committed: committed.filter(t => t !== toRemove),
            skipped: skipped.filter(t => t !== toRemove)
        })
        .then(() => {
            bot.postMessage(channel, `${toRemove} successfully removed.`);
        })
        .catch(err => {
            bot.postMessage(channel, `${toRemove} has not been removed (error): ${err}.`);
        });
    } else {
        bot.postMessage(channel, `${toRemove} not exist.`);
    }
}

// Reset Queue
function resetPending({stacks, docRef, channel}) {
    const { pending, committed, skipped } = stacks;
    while(committed.length) {
        pending.push(committed.pop());
    }
    setStacks(docRef, { pending, committed, skipped })
    .then(() => {
        bot.postMessage(channel, `list of pendings has been reseted.`);
    });
}

function getCurrent({stacks}) {
    const { pending } = stacks;
    const current = pending.pop();
    if(current) pending.push(current);
    return current;
}

function nextHandler({stacks, docRef, channel, user}) {
    const { pending, committed } = stacks;
    let current = getCurrent({stacks});
    // console.log(current,  '===', user);
    if (!current.includes(user)) {
        bot.postMessage(channel, `Only ${current} can command it at the momment.`);
        return;
    }
    committed.push(pending.pop());
    current = getCurrent({stacks});
    
    setStacks(docRef, stacks).then(() => {
        bot.postMessage(channel, `Next to challenge: ${current}.`);
        if(pending.length === 0) resetPending({stacks, docRef, channel});
    });
}

function skipHandler({stacks, docRef, channel}) {
    // const { pending, committed, skipped } = stacks;
    const current = stacks.pending.pop();
    if (!current) {
        bot.postMessage(channel, 'There is no users to skip!');
        return;
    }
    stacks.skipped.push(current);
    setStacks(docRef, stacks).then(() => {
        bot.postMessage(channel, `${current} skipped from challenge!`);
        if (stacks.pending.length === 0) resetPending({stacks, docRef, channel});
    });
}

function unskipHandler({stacks, docRef, channel, message}) {
    const [toUnSkip] = message.trim().split(' ');
    const { pending, skipped } = stacks;
    if (toUnSkip === 'all') {
        while(skipped.length) {
            pending.push(skipped.pop());
        }
        setStacks(docRef, stacks)
        .then(() => {
            bot.postMessage(channel, 'unskipped all users!');
        });
    }
}

function commandsHandler({channel}) {
    const msgs = [];
    commands.forEach(([command,,...desc]) => {
        msgs.push(`${command} ${desc.join(' ')}`);
    })
    bot.postMessage(channel, msgs.join('\n'));
}

function getStacks(docRef) {
    // const docRef = db.collection(`${team}-team`).doc(`${channel}-channel`);
     return new Promise((resolve, reject) => {
        docRef.get().then(doc => {
            if(doc.exists) {
                console.log(doc.data());
                resolve(doc.data());
            } else {
                const initDoc = {
                    pending: [],
                    committed: [],
                    skipped: []
                };
                setStacks(docRef, initDoc)
                .then(() => {resolve(initDoc)})
                .catch(reject);
            }
        });
     });
}

function setStacks(docRef, stacks) {
    console.log('stacks: ', stacks);
    // const docRef = db.collection(`${team}-team`).doc(`${channel}-channel`);
    return docRef.set(stacks);
}

function validUserTag(user) {
    const regx = /<@.*>/i;
    return regx.test(user);
}

function onlyUserTag(show, toAdd) {
    if (show) {
        bot.postMessage(channel, `Invalid ${toAdd}, just @user-tag is valid.`)
    }
}