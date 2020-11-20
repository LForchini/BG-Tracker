const Discord = require('discord.js');
const client = new Discord.Client();

const commands = require('./src/commands.js');
const settings = require('./settings.json');

client.on('ready', () => {
   console.log(`Logged in as ${client.user.tag}`);
});

client.on('message', msg => {
   var content = msg.content;
   if (content.startsWith(settings.prefix)) {
      commands.handle_message(msg).then(()=>undefined);
   }
});

client.login(settings.auth_token);
