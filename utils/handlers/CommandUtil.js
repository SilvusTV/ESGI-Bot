const { ApplicationCommandType } = require("discord.js");
const { promisify } = require('util');
const { glob } = require('glob');
const pGlob = promisify(glob);
const Logger = require('../Logger');

module.exports = async (client) => {
    (await pGlob(`${process.cwd()}/commands/*/*.js`)).map(async (cmdFile) =>{
        const cmd = require(cmdFile);

        if(!cmd.name) return Logger.warn(`no command name : ${cmdFile}`)

        if(!cmd.description && cmd.type !== ApplicationCommandType.User) return Logger.warn(`no command description : ${cmdFile}`)

        if(!cmd.category) return Logger.warn(`no command category : ${cmdFile}`)

        /*if(!cmd.defaultMemberPermissions) return Logger.warn(`no command permissions : ${cmdFile}`)*/

        if(cmd.ownerOnly === undefined) return Logger.warn(`no command ownerOnly : ${cmdFile}`)

        if(!cmd.usage) return Logger.warn(`no command usage : ${cmdFile}`)

        if(!cmd.examples) return Logger.warn(`no command examples : ${cmdFile}`)

        client.commands.set(cmd.name, cmd);
        Logger.command(`/${cmd.name} loaded`);
    });
};
