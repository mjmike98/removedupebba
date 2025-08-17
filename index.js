const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configManager = require('./utils/configManager');
const logger = require('./utils/logger');

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize collections for commands and message cache
client.commands = new Collection();
client.messageCache = new Map();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        logger.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);
        
        const errorMessage = 'There was an error while executing this command!';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Register slash commands
async function registerCommands() {
    const commands = [];
    
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || 'your_discord_bot_token');

    try {
        logger.info('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID || 'your_client_id'),
            { body: commands },
        );

        logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
        logger.error('Error registering commands:', error);
    }
}

// Error handling
process.on('unhandledRejection', error => {
    logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

// Initialize and start bot
async function startBot() {
    try {
        // Initialize configuration
        configManager.initConfig();
        
        // Register commands
        await registerCommands();
        
        // Login to Discord
        await client.login(process.env.DISCORD_TOKEN || 'your_discord_bot_token');
    } catch (error) {
        logger.error('Failed to start bot:', error);
        process.exit(1);
    }
}

startBot();

module.exports = client;

// --- keep-alive web server for Replit ---
const express = require("express");
const app = express();

app.get("/", (req, res) => {
    const status = {
        botName: client.user?.tag || 'RemoveDupe Bot',
        status: client.readyAt ? 'Online' : 'Starting...',
        uptime: client.uptime ? `${Math.floor(client.uptime / 1000 / 60)} minutes` : 'Starting...',
        guilds: client.guilds?.cache.size || 0,
        cachedMessages: client.messageCache?.size || 0
    };
    
    res.json({
        message: "Discord Bot is running!",
        timestamp: new Date().toISOString(),
        ...status
    });
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        botReady: !!client.readyAt
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server started on port ${PORT}`);
});
