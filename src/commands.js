const { Guild, Role, User, Message } = require("discord.js");
const { MongoClient } = require("mongodb");
const uri = "mongodb://127.0.0.1:27017";

const settings = require('../settings.json');

/**
 * Splits a message into the command and the arguments
 * @param {Message} msg Message to split
 */
function split_command(msg) {
    const command = msg.content.split(' ')[0].slice(settings.prefix.length);
    var args = msg.content.split(' ');
    args.reverse().pop();
    args.reverse(); // remove first element (probably nicer ways)

    return {command: command, args: args};
}

/**
 * Creates a database entry for the inputted user in the appropriate guild. If it already exists, the
 * function just returns without doing anything. If there are no other users, the first user will be
 * an admin.
 * @param {User} user User for which to create an entry
 */
async function add_user(c, user) {
    const uc = c.uc;

    const filtered_doc_count = await uc.countDocuments({ userID: user.id });
    const doc_count = await uc.countDocuments();

    if  (filtered_doc_count != 0) {
        return;
    }

    const entry = {
        userID: user.id,
        admin: doc_count == 0, // The first user will be an admin
        achievements: []
    }
    uc.insertOne(entry);
}

/**
 * Returns the entry for the user in the guild's database
 * @param {User} user User to return from guild
 */
async function get_user(c, user) {
    await add_user(c, user);

    const uc = c.uc;
    const entry = await uc.findOne({ userID: user.id });
    return entry;
}

/**
 * Returns whether a given user is an admin in the guild
 * @param {User} user User to check for admin status
 */
async function user_is_admin(c, user) {
    return (await get_user(c, user)).admin;
}

/**
 * Returns the user's achievements in the specified guild
 * @param {User} user User of who to get the achievements
 */
async function get_user_achievements(c, user) {
    const user_data = await get_user(c, user);
    return user_data.achievements;
}

/**
 * Adds an achievement to the guild which can be achieved by users. Returns a reply String.
 * @param {String} name Name of the achievement
 * @param {String} desc Description of the achievement
 * @param {Role} role If specified, a role to add to a user if they get the achievement
 * @param {Boolean} requires_proof If the user has to upload a link as proof
 */
async function new_achievement(c, name, desc, role=null, requires_proof=false) {
    const ac = c.ac;

    const filtered_doc_count = await ac.countDocuments({ name: name });
    if (filtered_doc_count != 0) {
        return `\`${name}\` already exists!`;
    }

    var roleIn = null;
    if (role != null) {
        roleIn = role.id;
    }

    const entry = {
        name: name,
        desc: desc,
        role: roleIn,
        requires_proof: requires_proof
    };
    ac.insertOne(entry);
    return `\`${name}\` successfully created!`;
}

/**
 * Deletes an achievement in the Guild, returns a String which should be the reply.
 * Also removes all instances of the achievement in all the users.
 * @param {Guild} guild Guild in which to delete the achivement
 * @param {String} name Name of the achievement to delete
 */
async function delete_achievement(c, name, guild) {
    const ac = c.ac;
    const uc = c.uc;

    const filtered_doc_count = await ac.countDocuments({ name: name });
    if (filtered_doc_count == 0) {
        return `\`${name}\` doesn't exist!`;
    }

    const users = uc.find();
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        for (achievement in user.achievements) {
            if (achievement.name == name)
                remove_achievement(c, guild.member(user.id).user, name, guild);
        }
    }

    ac.findOneAndDelete({ name: name });
    return `\`${name}\` successfully deleted!`;
}


/**
 * Adds an achievement to the user in the guild. If the achievement requires a proof,
 * it adds that too.
 * @param {User} user 
 * @param {String} name 
 * @param {Guild} guild 
 * @param {String} proof 
 */
async function add_achievement(c, user, name, guild, proof=null) {
    const ac = await c.ac;
    const uc = await c.uc;

    const filtered_achievement_doc_count = await ac.countDocuments({ name: name });
    if (filtered_achievement_doc_count == 0) {
        return `\`${name}\` doesn't exist!`;
    }

    var user_data = await get_user(c, user);
    for (var i = 0; i < user_data.achievements.length; i++) {
        var achievement = user_data.achievements[i];
        if (achievement.name == name) {
            return `${user.username} has already achieved \`${name}\``;
        }
    }
    
    var insert = {name: name};
    if (await requires_proof(c, name)) {
        if (proof != null) {
            insert.proof = proof;
        } else {
            return `\`${name}\` requires proof!`;
        }
    }
    user_data.achievements.push(insert);

    uc.findOneAndReplace({ userID: user.id }, user_data);

    if (await has_role(c, name)) {
        guild.member(user).roles.add(await get_role(c, name));
    }

    return `Congratulations to ${user.username} for achieving \`${name}\``;
}

/**
 * Removes an achievement from the user in a guild.
 * @param {User} user 
 * @param {String} name 
 * @param {Guild} guild 
 */
async function remove_achievement(c, user, name, guild) {
    const ac = c.ac;
    const uc = c.uc;

    const filtered_achievement_doc_count = await ac.countDocuments({ name: name });
    if (filtered_achievement_doc_count == 0) {
        return `\`${name}\` doesn't exist!`;
    }

    var user_data = await get_user(c, user);
    var index = -1;

    for (var i = 0; i < user_data.achievements.length; i++) {
        console.log(i, name, user_data.achievements[i].name);
        if (name == user_data.achievements[i].name) {
            index = i;
        }
    }

    if (index != -1) {
        user_data.achievements.splice(index, 1);
    } else {
        return `${user.username} hasn't achieved \`${name}\` anyways`;
    }

    if (await has_role(c, name)) {
        guild.member(user).roles.remove(await get_role(c, name));
    }

    uc.findOneAndReplace({ userID: user.id }, user_data);

    return `\`${name}\` has been successfully removed`;
}

/**
 * Returns a string containing all the available achievements in the Guild
 * @param {Guild} guild 
 */
async function available_achievements(c, guild) {
    const ac = c.ac;

    var resp = "Available achievements:";

    const achievements = await (await ac.find()).toArray();
    for (var i = 0; i < achievements.length; i++) {
        var achievement = achievements[i];
        resp += `\n\`${achievement.name}\`: ${achievement.desc}`;

        if (achievement.role != null) {
            resp += `\n\tGives the role "${guild.roles.resolve(achievement.role).name}"`;
        }

        if (achievement.requires_proof) {
            resp += `\n\tThis achievement requires proof`;
        }
    }

    return resp;
}

/**
 * Lists all the achievements the user has in the guild, along with their descriptions and proofs.
 * @param {User} user 
 * @param {Guild} guild 
 */
async function list_achievements(c, user) {
    const achievements = await get_user_achievements(c, user);

    var resp = `${user.username}'s Achievements:`;

    console.log(achievements);
    for (var i = 0; i < achievements.length; i++) {
        var achievement = achievements[i];
        console.log(achievement);
        resp += `\n\`${achievement.name}\` - ${await get_desc(c, achievement.name)}`;

        if (achievement.proof != null) {
            resp += `\n\tProof: ${achievement.proof}`;
        } 
    }

    return resp;
}

/**
 * Adds user as an admin in guild.
 * @param {User} user 
 * @param {Guild} guild 
 */
async function add_admin(c, user) {
    if (await user_is_admin(c, user)) {
        return `${user.username} is already an admin`;
    }

    const uc = c.uc;
    var user_data = await get_user(c, user);
    user_data.admin = true;
    console.log(user_data);
    uc.findOneAndReplace( { userID: user.id }, user_data);
    return `Successfully made ${user.username} an admin`;
}

/**
 * Removes user as an admin in guild.
 * @param {User} user 
 * @param {Guild} guild 
 */
async function remove_admin(c, user) {
    if (! await user_is_admin(c, user)) {
        return `${user.username} is not an admin`;
    }

    const uc = c.uc;
    var user_data = await get_user(c, user);
    user_data.admin = false;
    uc.findOneAndReplace( { userID: user.id }, user_data);
    return `Successfully removed ${user.username} as an admin`;
}

/**
 * Returns whether the given achievement requires a proof or not
 * @param {String} name 
 * @param {Guild} guild 
 */
async function requires_proof(c, name) {
    var o = (await get_achievement(c, name)).requires_proof;
    return o;
}

/**
 * Returns whether the given achievement gives a role when completed.
 * @param {String} name 
 * @param {Guild} guild 
 */
async function has_role(c, name) {
    return (await get_achievement(c, name)).role != null;
}

/**
 * Returns the role the given achievement gives when completed.
 * @param {String} name 
 * @param {Guild} guild 
 */
async function get_role(c, name) {
    return (await get_achievement(c, name)).role;
}

/**
 * Returns the role the given achievement gives when completed.
 * @param {String} name 
 * @param {Guild} guild 
 */
async function get_desc(c, name) {
    return (await get_achievement(c, name)).desc;
}

/**
 * Returns the entry of the achievement in the guild.
 * NOTE: IT DOES NOT CHECK IF THE ACHIEVEMENT ACTUALLY EXISTS
 * @param {String} name 
 * @param {Guild} guild 
 */
async function get_achievement(c, name) {
    const ac = c.ac;
    const entry = await ac.findOne({ name: name });
    return entry;
}

/**
 * Handle the execution of the command in the msg. 
 * @param {Message} msg 
 */
async function handle_message(msg) {
    var {command, args} = split_command(msg);
    var response;
    if (command in commands) {
        const client = MongoClient(uri, { useUnifiedTopology: true });
        await client.connect();
        var collections = {
            uc: client.db(`achievement_tracking_${msg.guild.id}`).collection('users'),
            ac: client.db(`achievement_tracking_${msg.guild.id}`).collection('achievements')
        }
        if (command.requires_admin && ! (await user_is_admin(collections, m.author))) {
            response = `\`${command}\` requires admin permissions to run`;
        } else {
            response = await commands[command].run(collections, msg);
        }
    } else {
        response = `This is an unrecognised command, please use \`${settings.prefix}help\` for help`;
    }
    console.log(`Replied to '${command}' from ${msg.author.username}`);
    msg.reply(response);
}

commands = {
    "help": {
        usage: "help",
        desc: "Lists available commands",
        requires_admin: false,

        /**
         * This function generates a help message. It displays admin only commands only if the user is admin.
         */
        run: (c, m) => {
            const admin = user_is_admin(c, m.author);

            var resp = "This is the list of available commands: \n";
            for (command in commands) {
                if (command.requires_admin) {
                    if (admin) {
                        resp +=`\n\`${settings.prefix}${commands[command].usage}\` (admin): ${commands[command].desc}`;
                    }
                } else {
                    resp += `\n\`${settings.prefix}${commands[command].usage}\`: ${commands[command].desc}`;
                }
            }
            return resp;
        }
    },
    "new-achievement": {
        usage: "new-achievement '<name>' '<desc>' <role>? <req proof>?",
        desc: "Creates a new achievement <name> with the description <desc>. If a <role> is given, upon completing the achievement, the achiever will get it. If <req proof> is 'true', a proof must be given upon completing the achievement. The single quotes are necessary.",
        requires_admin: true,

        run: async (c, m) => {
            var command = split_command(m);
            var args = command.args;
            
            var proof = args[args.length - 1] == "true";
            var role;
            if (m.mentions.roles.array().length == 1) {
                role = m.mentions.roles.first();
            } else if (m.mentions.roles.length > 1) {
                return "Can only have a single role";
            }

            if ((m.content.match(/'/g) || []).length != 4) {
                return "The command is badly formatted";
            }
            var split = m.content.split(`'`);
            var name = split[1];
            var desc = split[3];

            return await new_achievement(c, name, desc, role, proof);
        }
    },
    "delete-achievement": {
        usage: "delete-achievement '<name>'",
        desc: "Deletes the achievement specified by <name>. The single quotes are necessary.",
        requires_admin: true,

        run: async (m) => {
            if ((m.content.match(/'/g) || []).length != 2) {
                return "The command is badly formatted";
            }
            var split = m.content.split(`'`);
            var name = split[1];

            return await delete_achievement(c, name, m.guild);
        }
    },
    "available-achievements": {
        usage: "available-achievements",
        desc: "Lists all the available achievements and their descriptions",
        requires_admin: false,

        run: async (c, m) => {
            return await available_achievements(c, m.guild);
        }
    },
    "add-achievement": {
        usage: "add-achievement <user>? '<name>' '<proof>'?",
        desc: "If a <user> is given, it adds the achievement to the <user>, otherwise to the caller. <proof> is only required if the achievement need it. Single quotes are necessary.",
        requires_admin: false,

        run: async (c, m) => {
            if ((m.content.match(/'/g) || []).length != 2 &&  (m.content.match(/'/g) || []).length != 4) {
                return "The command is badly formatted";
            }
            var split = m.content.split(`'`);
            var name = split[1];

            var proof = null;
            if (split.length == 5) {
                proof = split[3];
            }

            if (m.mentions.users.array().length == 1) {
                if (await user_is_admin(c, m.author)) {
                    return await add_achievement(c, m.mentions.users.first(), name, m.guild, proof)
                } else {
                    return "Must be admin to add someone else's achievement";
                }
            }
            return await add_achievement(c, m.author, name, m.guild, proof)
        }
    },
    "remove-achievement": {
        usage: "remove-achievement <user>? '<name>'",
        desc: "If a user is given, it removes their achievement, otherwise it removes the caller's.",
        requires_admin: false,

        run: async (c, m) => {
            if ((m.content.match(/'/g) || []).length != 2 ) {
                return "The command is badly formatted";
            }
            var split = m.content.split(`'`);
            var name = split[1];

            if (m.mentions.users.array().length == 1) {
                if (await user_is_admin(c, m.author)) {
                    return await remove_achievement(c, m.mentions.users.first(), name, m.guild)
                } else {
                    return "Must be admin to add someone else's achievement";
                }
            }
            return await remove_achievement(c, m.author, name, m.guild)
        }
    },
    "list-achievements": {
        usage: "list-achievements <user>?",
        desc: "If the user is given, it displays their achievements, otherwise the caller's.",
        requires_admin: false,

        run: async (c, m) => {

            if (m.mentions.users.array().length == 1) {
                return await list_achievements(c, m.mentions.users.first())
            }
            return await list_achievements(c, m.author)
        }
    },
    "add-admin": {
        usage: "add-admin <user>",
        desc: "Makes the <user> an admin",
        requires_admin: true,

        run: async (c, m) => {
            if (m.mentions.users.array().length == 1) {
                return await add_admin(c, m.mentions.users.first())
            }
            return `A user must be mentioned`;
        }
    },
    "remove-admin": {
        usage: "remove-admin <user>",
        desc: "Removes admin status from user",
        requires_admin: true,

        run: async (c, m) => {
            if (m.mentions.users.array().length == 1) {
                return await remove_admin(c, m.mentions.users.first())
            }
            return `A user must be mentioned`;
        }
    }
    
};

module.exports = {
    handle_message
};