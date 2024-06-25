import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    GuildMember, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    TextChannel
} from "discord.js";
import chalk from "chalk";
import config from "../config.json";
import fs from "fs";

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences]});
let doing: any[] = [];

client.on(Events.ClientReady, async () => {
    if (client.guilds.cache.size > 1) {
        console.log(chalk.blue(
            "A bot megfelelő működés helye: " +
            client.guilds.cache.first()!.name
        ));
    }
    try {
        await whitelistInitialize();
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

async function whitelistInitialize() {
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
    const channel = checkChannel();
    const embed = new EmbedBuilder()
        .setTitle(`Whitelist rendszer`)
        .setDescription("Kattints a gombra hogy elindítsd a Whitelist tesztet!")
        .setColor("Green")
        .setThumbnail(client.guilds.cache.first()!.iconURL()!)
        .setFooter({text: "A botot MedveMarci készítette"});
    const row = new ActionRowBuilder<ButtonBuilder>();
    const button = new ButtonBuilder()
        .setStyle(ButtonStyle.Success)
        .setLabel("Whitelist teszt")
        .setCustomId("whitelist_test");
    row.addComponents(button);
    channel?.messages.fetch({limit: 1}).then(async (messages: { first: () => any; }) => {
        let lastMessage = messages.first();
        if (lastMessage == null) {
            const message = await channel?.send({embeds: [embed], components: [row]});
            lastMessage = message;
            config.WhitelistMessageID = message?.id;
            try {
                fs.writeFileSync(`./config.json`, JSON.stringify(config, null, 2));
            } catch (e) {
                console.log(`Hiba a file írásakor `, e);
            }
        }
        if (lastMessage.author.id !== client.user?.id) {
            const message = await channel?.send({embeds: [embed], components: [row]});
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
            if (member.roles.cache.has(role.id)) await interaction.reply({
                content: "Már rajta vagy a Whitelisten!",
                ephemeral: true
            });
            if (interaction.replied) return;
            if (doing.find(item => item.id === member.id)) return interaction.reply({
                content: "Már elindítottad a tesztet!",
                ephemeral: true
            });
            if (interaction.replied) return;
            doing.push({
                id: member.id,
                wrong: 0,
                question: 0,
                completedQuestions: []
            });
            const embed = new EmbedBuilder()
                .setTitle(`Whitelist teszt`)
                .setDescription(`Bizonyos számú kérdésre kell válaszolnod, hogy megkapd a Whitelist rangot! ${config.MaxWrong} hibázási lehetőséged van!`)
                .setColor("Green")
                .setThumbnail(client.guilds.cache.first()!.iconURL()!)
                .setFooter({text: "A botot MedveMarci készítette"});
            await member.send({embeds: [embed]}).catch(() => {
                    doing = doing.filter(item => item.id !== member.id);
                    interaction.reply({
                        content: "Nem tudtam elküldeni a privát üzenetet!",
                        ephemeral: true
                    });
                }
            );
            if (interaction.replied) return;
            interaction.reply({content: "Sikeresen elindítottad a tesztet!", ephemeral: true});
            await nextQuestion(member);
        }
    });
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId.split("-")[0] !== "question") return;
        const member = client.guilds.cache.first()?.members.cache.get(interaction.user.id);
        const correct = interaction.customId.split("-")[1];
        const answer = Number(interaction.values[0]) - 1;
        if (member == null) return;
        if (answer === Number(correct)) {
            await interaction.reply({content: "Helyes válasz!", ephemeral: true});
            const data = doing.find(item => item.id === member.id);
            if (data == null) return;
            data.completedQuestions.push(data.question);
            if (data.completedQuestions.length >= Object.keys(config.Test).length) {
                const role = client.guilds.cache.first()?.roles.cache.get(config.WhitelistRoleID);
                if (role == null) return;
                await member.roles.add(role).catch((e: any) => {
                    console.error(chalk.red("Hiba történt a rang hozzáadásakor!"), e);
                });
                await interaction.editReply({content: "Helyes válasz!\nSikeresen teljesítetted a tesztet, megkaptad a Whitelist rangot!"}).catch(() => console.error(chalk.red("Nem tudtam elküldeni a privát üzenetet!")));
                doing = doing.filter(item => item.id !== member.id);
                return;
            } else {
                data.question++;
                await nextQuestion(member);
            }
        } else {
            await interaction.reply({content: "Hibás válasz!", ephemeral: true});
            const data = doing.find(item => item.id === member.id);
            if (data == null) return;
            data.completedQuestions.push(data.question);
            data.wrong++;
            if (data.wrong >= config.MaxWrong) {
                await interaction.editReply({content: "Hibás válasz!\nSajnos nem sikerült a teszt, próbáld újra később!"}).catch(() => console.error(chalk.red("Nem tudtam elküldeni a privát üzenetet!")));
                doing = doing.filter(item => item.id !== member.id);
                return;
            } else if (data.completedQuestions.length >= Object.keys(config.Test).length) {
                const role = client.guilds.cache.first()?.roles.cache.get(config.WhitelistRoleID);
                if (role == null) return;
                await member.roles.add(role).catch((e: any) => {
                    console.error(chalk.red("Hiba történt a rang hozzáadásakor!"), e);
                });
                await interaction.editReply({content: "Hibás válasz!\nSikeresen teljesítetted a tesztet, megkaptad a Whitelist rangot!"}).catch(() => console.error(chalk.red("Nem tudtam elküldeni a privát üzenetet!")));
                doing = doing.filter(item => item.id !== member.id);
                return;
            } else {
                data.question++;
                await nextQuestion(member);
            }
        }
    });
}

async function nextQuestion(member: GuildMember) {
    if (member == null) return;
    const data = doing.find(item => item.id === member.id);
    if (data == null) return;
    if (config.RandomOrder) {
        const random = Math.floor(Math.random() * Object.keys(config.Test).length);
        if (data.completedQuestions.includes(random)) {
            return nextQuestion(member);
        }
        data.question = random;
    }
    const q = data.question;
    let question = "";
    let options: string | any[] = [];
    let correct = 0;
    for (const key in config.Test[q]) {
        const test: { [key: string]: number | string[] | undefined } = config.Test[q];
        const value = test[key];
        if (key !== "Megoldás" && typeof value === "object") {
            question = key;
            options = value as string[];
        }
        if (key === "Megoldás") {
            correct = value as number;
        }
    }
    const embed = new EmbedBuilder()
        .setTitle(question)
        .setColor("Blue")
        .setThumbnail(client.guilds.cache.first()!.iconURL()!)
        .setFooter({text: "A botot MedveMarci készítette"});
    for (let j = 0; j < options.length; j++) {
        embed.addFields({name: options[j], value: "\u200B", inline: false});
    }
    const select = new StringSelectMenuBuilder()
        .setCustomId(`question-${correct - 1}`)
        .setPlaceholder('1 válaszra nyomj rá!');
    for (let i = 0; i < options.length; i++) {
        const option = new StringSelectMenuOptionBuilder()
            .setLabel(`${i + 1}.`)
            .setValue(`${i + 1}`)
            .setDescription(options[i]);
        select.addOptions(option);
    }
    const row = new ActionRowBuilder()
        .addComponents(select);
    if (data.completedQuestions.length === 0) {
        // @ts-ignore
        await member.send({embeds: [embed], components: [row]}).catch(() => {
            doing = doing.filter(item => item.id !== member.id);
            member.send({content: "Nem tudtam elküldeni a kérdést!"});
        });
    } else {
        // @ts-ignore
        await member.dmChannel?.messages.cache.last()?.edit({embeds: [embed], components: [row]}).catch(() => {
            doing = doing.filter(item => item.id !== member.id);
            member.send({content: "Nem tudtam szerkeszteni a kérdést!"});
        });
    }
}

function getChannel(id: string) {
    const channel = client.guilds.cache.first()?.channels.cache.get(`${id}`);
    return channel as TextChannel;
}

function checkChannel() {
    const channel = getChannel(config.WhitelistChannelID!);
    if (channel == null) {
        console.error(chalk.red("A csatorna nem található!"));
        return;
    }
    return channel;
}