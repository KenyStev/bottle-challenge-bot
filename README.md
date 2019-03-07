# Bottle Challenge
Bottle Challenge is a slack's bot for keeping order in the office, It commands whose the next one who'll be challenged to change the bottle of water in the office xD.

## Manage the Bot
To command something to the bot you'd need to tag the bot `(@bot-name)` before the actual command.

### commands to setting up the queue
  - `add [@user-tag, @user-tag, @user-tag, ...]`
  - `remove @user-tag`

### commands to change the state of the queue
- `next` move the challenge on to the next one (just granted to the current challengee).
- `skip` move the challenge on to the next one but keeps the skipped one apart as incompleted mission.
- `unskip all` move on the ones who had skipped the challenge again to challenge them.

### commands to show info
- `challenge` shows the current chalengee.
- `show pendings` shows in order, the ones who has not completed the challenge but neither skipped.
- `commands` show tha list of commands and their description.

### Tech

Bottle Challenge uses a few of open source projects to work properly:

* [firebase](https://www.npmjs.com/package/firebase) - NoSQL database provided by google
* [slackbots](https://www.npmjs.com/package/slackbots) - slack's api for handling commands through sockets

And of course Bottle Challenge itself is open source with a [public repository][dill] on GitHub.

### Installation

Bottle Challenge requires [Node.js](https://nodejs.org/) v5+ to run.

Clone the project on your machine.
```sh
$ git clone https://github.com/KenyStev/bottle-challenge-bot.git
$ cd bottle-challenge-bot
```

Before run the bot you'll need to add some [config files](#config-files) to your project.
Install the dependencies and start the server.

```sh
$ npm install
$ npm start
```

### Config Files

./firebase-config.json
Create your database project on **[Firebase Cloud Firestore](https://console.firebase.google.com)** and get the config for web, it should looks something like this example:
```json
{
    "apiKey": "xxXXxXxxXxxXXxxxxxXXxxxXXXxxxXXxXXXxXxx",
    "authDomain": "your-domain.firebaseapp.com",
    "databaseURL": "https://your-database-adsad.firebaseio.com",
    "projectId": "your-project-adsad",
    "storageBucket": "your-project-adsad.appspot.com",
    "messagingSenderId": "xxxxxxxxxxx"
}
```

./slack-config.json
- Create your app on **[Slack Apps](https://api.slack.com/apps)** 
- Fill the Basic Information Section -> Display Information
- Add features and functionality -> Bots
- Install your app to your workspace
- **OAuth & Permissions** section, then copy the **Bot User OAuth Access Token**
- paste the token and the app name in the file

Finally it should looks something like this example:
```json
{
    "token": "xaxax-xxxxxxxxxxxxxxx-xxxxxxxxxxxxxxx-fsdFsDrgsRTgsErv2er5v45se1",
    "name": "app-name"
}
```

### Todos

 - Write Tests
 - Add short-hand commands
 - Distribute the bot on slack

License
----

MIT