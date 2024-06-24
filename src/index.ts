import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Events, GatewayIntentBits, GuildMember, TextChannel } from "discord.js";
import chalk from "chalk";
import config from "../config.json";
import fs from "fs";

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences ] });
let doing: any[] = [];

client.on(Events.ClientReady, async () => {
    if (client.guilds.cache.size > 1) {
        console.log(chalk.blue(
            "A bot megfelelő működés helye: " +
            client.guilds.cache.first()!.name
        ));
    }
    try {
        WhitelistInitialize();
        console.log(chalk.green(`${client.user?.username} sikeresen elindult!`));
    } catch (e) {
        console.log(e);
        console.log(chalk.red("Hibát találtam! Konzolban találod a hibakódot"));
    }
});

client.login(config.Token).then().catch(e => {
    console.error(chalk.red("Hiba történt a bejelentkezés során!"));
    console.log(e);
});

async function WhitelistInitialize() {
    const role = client.guilds.cache.first()?.roles.cache.get(config.WhitelistRoleID);
    if (config.WhitelistChannelID === "") {
        console.error(chalk.red("A Whitelist Channel ID nem lehet üres!"));
        process.exit(1);
    }
    if (config.WhitelistRoleID === "") {
        console.error(chalk.red("A Whitelist Role ID nem lehet üres!"));
        process.exit(1);
    }
    if (!role) {
        console.error(chalk.red("A rang nem található!"));
        process.exit(1);
    }
    const channel = CheckChannel();
    const embed = new EmbedBuilder()
    .setTitle(`Whitelist rendszer`)
    .setDescription("Kattints a gombra hogy elindítsd a Whitelist tesztet!")
    .setColor("Green")
    .setThumbnail(client.guilds.cache.first()!.iconURL()!)
    .setFooter({ text: "A botot MedveMarci készítette" });
    const row = new ActionRowBuilder<ButtonBuilder>();
    const button = new ButtonBuilder()
        .setStyle(ButtonStyle.Success)
        .setLabel("Whitelist teszt")
        .setCustomId("whitelist_test");
    row.addComponents(button);
    channel?.messages.fetch({ limit: 1 }).then(async (messages: { first: () => any; }) => {
        let lastMessage = messages.first();
        if (lastMessage == null) {
            const message = await channel?.send({ embeds: [ embed ], components: [ row ]});
            lastMessage = message;
            config.WhitelistMessageID = message?.id;
            try {
                fs.writeFileSync(`./config.json`, JSON.stringify(config, null, 2));
            } catch (e) {
                console.log(`Hiba a file írásakor `, e);
            }
        }
        if (lastMessage.author.id != client.user?.id) {
            const message = await channel?.send({ embeds: [ embed ], components: [ row ] });
            config.WhitelistMessageID = message?.id;
            try {
                fs.writeFileSync(`./config.json`, JSON.stringify(config, null, 2));
            } catch (e) {
                console.log(`Hiba a file írásakor `, e);
            }
        }
    });
    client.on("interactionCreate", async interaction => {
        if (!interaction.isButton()) return;
        if (interaction.customId === "whitelist_test") {
            const member = client.guilds.cache.first()?.members.cache.get(interaction.user.id);
            if (member == null) return;
            if (member.roles.cache.has(role.id)) await interaction.reply({ content: "Már rajta vagy a Whitelisten!", ephemeral: true });
            if (interaction.replied) return;
            if (doing.includes(member.id)) await interaction.reply({ content: "Már elkezdtél egy tesztet!", ephemeral: true });
            if (interaction.replied) return;
            const embed = new EmbedBuilder()
            .setTitle(`Whitelist teszt`)
            .setDescription("Bizonyos számú kérdésre kell válaszolnod, hogy megkapd a Whitelist rangot! 3 hibázási lehetőséged van!")
            .setColor("Green")
            .setThumbnail(client.guilds.cache.first()!.iconURL()!)
            .setFooter({ text: "A botot MedveMarci készítette" });
            await member.send({embeds: [embed]}).catch(() => interaction.reply({ content: "Nem tudtam elküldeni a privát üzenetet!", ephemeral: true }));
            if (interaction.replied) return;
            doing.push(member.id);
            interaction.reply({ content: "Sikeresen elindítottad a tesztet!", ephemeral: true });
            StartDMQuestion(member);
    }});
}

function StartDMQuestion(member: GuildMember) {
    if (member == null) return;
    for (let item of config.Test) {
        let test: { [key: string]: number | string[] | undefined } = item;
        let question = ""
        let options: string | any[] = []
        let correct = 0;
        for (let key in test) {
            let value = test[key];
            if (key != "Megoldás" && typeof value === "object") {
                question = key;
                options = value as string[];
            }
            if (key == "Megoldás") {
                correct = value as number;
            }
        }
        const embed = new EmbedBuilder()
            .setTitle(question)
            .setColor("Blue")
            .setThumbnail(client.guilds.cache.first()!.iconURL()!)
            .setFooter({ text: "A botot MedveMarci készítette" });
            for (let j = 0; j < options.length; j++) {
                embed.addFields({name: `${j + 1}.`, value: options[j], inline: true});
            }
        member.send({ embeds: [embed] }).catch(() => member.send({ content: "Nem tudtam elküldeni a kérdést!" }));
    }
}

/*member.roles.add(role).catch((e: any) => {
                console.error(chalk.red("Hiba történt a rang hozzáadásakor!"), e);
            });*/
function GetChannel(id: string) {
    const channel = client.guilds.cache.first()?.channels.cache.get(`${id}`);
    return channel as TextChannel;
}

function CheckChannel() {
    const channel = GetChannel(config.WhitelistChannelID!);
    if (channel == null) {
        console.error(chalk.red("A csatorna nem található!"));
        return;
    }
    return channel;
}