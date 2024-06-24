"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const chalk_1 = __importDefault(require("chalk"));
const config_json_1 = __importDefault(require("../config.json"));
const fs_1 = __importDefault(require("fs"));
const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildPresences] });
let doing = [];
client.on(discord_js_1.Events.ClientReady, () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (client.guilds.cache.size > 1) {
        console.log(chalk_1.default.blue("A bot megfelelő működés helye: " +
            client.guilds.cache.first().name));
    }
    try {
        WhitelistInitialize();
        console.log(chalk_1.default.green(`${(_a = client.user) === null || _a === void 0 ? void 0 : _a.username} sikeresen elindult!`));
    }
    catch (e) {
        console.log(e);
        console.log(chalk_1.default.red("Hibát találtam! Konzolban találod a hibakódot"));
    }
}));
client.login(config_json_1.default.Token).then().catch(e => {
    console.error(chalk_1.default.red("Hiba történt a bejelentkezés során!"));
    console.log(e);
});
function WhitelistInitialize() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const role = (_a = client.guilds.cache.first()) === null || _a === void 0 ? void 0 : _a.roles.cache.get(config_json_1.default.WhitelistRoleID);
        if (config_json_1.default.WhitelistChannelID === "") {
            console.error(chalk_1.default.red("A Whitelist Channel ID nem lehet üres!"));
            process.exit(1);
        }
        if (config_json_1.default.WhitelistRoleID === "") {
            console.error(chalk_1.default.red("A Whitelist Role ID nem lehet üres!"));
            process.exit(1);
        }
        if (!role) {
            console.error(chalk_1.default.red("A rang nem található!"));
            process.exit(1);
        }
        const channel = CheckChannel();
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`Whitelist rendszer`)
            .setDescription("Kattints a gombra hogy elindítsd a Whitelist tesztet!")
            .setColor("Green")
            .setThumbnail(client.guilds.cache.first().iconURL())
            .setFooter({ text: "A botot MedveMarci készítette" });
        const row = new discord_js_1.ActionRowBuilder();
        const button = new discord_js_1.ButtonBuilder()
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setLabel("Whitelist teszt")
            .setCustomId("whitelist_test");
        row.addComponents(button);
        channel === null || channel === void 0 ? void 0 : channel.messages.fetch({ limit: 1 }).then((messages) => __awaiter(this, void 0, void 0, function* () {
            var _b;
            let lastMessage = messages.first();
            if (lastMessage == null) {
                const message = yield (channel === null || channel === void 0 ? void 0 : channel.send({ embeds: [embed], components: [row] }));
                lastMessage = message;
                config_json_1.default.WhitelistMessageID = message === null || message === void 0 ? void 0 : message.id;
                try {
                    fs_1.default.writeFileSync(`./config.json`, JSON.stringify(config_json_1.default, null, 2));
                }
                catch (e) {
                    console.log(`Hiba a file írásakor `, e);
                }
            }
            if (lastMessage.author.id != ((_b = client.user) === null || _b === void 0 ? void 0 : _b.id)) {
                const message = yield (channel === null || channel === void 0 ? void 0 : channel.send({ embeds: [embed], components: [row] }));
                config_json_1.default.WhitelistMessageID = message === null || message === void 0 ? void 0 : message.id;
                try {
                    fs_1.default.writeFileSync(`./config.json`, JSON.stringify(config_json_1.default, null, 2));
                }
                catch (e) {
                    console.log(`Hiba a file írásakor `, e);
                }
            }
        }));
        client.on("interactionCreate", (interaction) => __awaiter(this, void 0, void 0, function* () {
            var _c;
            if (!interaction.isButton())
                return;
            if (interaction.customId === "whitelist_test") {
                const member = (_c = client.guilds.cache.first()) === null || _c === void 0 ? void 0 : _c.members.cache.get(interaction.user.id);
                if (member == null)
                    return;
                if (doing.includes(member.id))
                    yield interaction.reply({ content: "Már elkezdtél egy tesztet!", ephemeral: true });
                if (interaction.replied)
                    return;
                if (member.roles.cache.has(role.id))
                    yield interaction.reply({ content: "Már rajta vagy a Whitelisten!", ephemeral: true });
                if (interaction.replied)
                    return;
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle(`Whitelist teszt`)
                    .setDescription("Bizonyos számú kérdésre kell válaszolnod, hogy megkapd a Whitelist rangot! 3 hibázási lehetőséged van!")
                    .setColor("Green")
                    .setThumbnail(client.guilds.cache.first().iconURL())
                    .setFooter({ text: "A botot MedveMarci készítette" });
                yield member.send({ embeds: [embed] }).catch(() => interaction.reply({ content: "Nem tudtam elküldeni a privát üzenetet!", ephemeral: true }));
                if (interaction.replied)
                    return;
                doing.push(member.id);
                interaction.reply({ content: "Sikeresen elindítottad a tesztet!", ephemeral: true });
                StartDMQuestion(member);
            }
        }));
    });
}
function StartDMQuestion(member) {
    if (member == null)
        return;
    for (let item of config_json_1.default.Test) {
        let test = item;
        let question = "";
        let options = [];
        let correct = 0;
        for (let key in test) {
            let value = test[key];
            if (key != "Megoldás" && typeof value === "object") {
                question = key;
                options = value;
            }
            if (key == "Megoldás") {
                correct = value;
            }
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(question)
            .setColor("Blue")
            .setThumbnail(client.guilds.cache.first().iconURL())
            .setFooter({ text: "A botot MedveMarci készítette" });
        for (let j = 0; j < options.length; j++) {
            embed.addFields({ name: `${j + 1}.`, value: options[j], inline: true });
        }
        member.send({ embeds: [embed] }).catch(() => member.send({ content: "Nem tudtam elküldeni a kérdést!" }));
    }
}
function GetChannel(id) {
    var _a;
    const channel = (_a = client.guilds.cache.first()) === null || _a === void 0 ? void 0 : _a.channels.cache.get(`${id}`);
    return channel;
}
function CheckChannel() {
    const channel = GetChannel(config_json_1.default.WhitelistChannelID);
    if (channel == null) {
        console.error(chalk_1.default.red("A csatorna nem található!"));
        return;
    }
    return channel;
}
