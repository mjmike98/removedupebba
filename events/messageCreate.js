const DuplicateDetector = require('../utils/duplicateDetector');
const configManager = require('../utils/configManager');
const logger = require('../utils/logger');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignore messages from the bot itself
        if (message.author.id === client.user.id) {
            return;
        }

        // Only process messages in guilds (not DMs)
        if (!message.guild) {
            return;
        }

        try {
            const guildId = message.guild.id;
            const config = configManager.getConfig(guildId);
            const duplicateDetector = new DuplicateDetector(client);

            // Check if message is a duplicate
            if (duplicateDetector.isDuplicate(message, config)) {
                await handleDuplicate(message, config, client);
            }
        } catch (error) {
            logger.error('Error processing message for duplicates:', error);
        }
    },
};

/**
 * Handle duplicate message deletion and logging
 * @param {Message} message - The duplicate message
 * @param {Object} config - Bot configuration
 * @param {Client} client - Discord client
 */
async function handleDuplicate(message, config, client) {
    try {
        // Delete the duplicate message
        await message.delete();
        
        const logMessage = `Deleted duplicate message from ${message.author.tag} (${message.author.id}) in ${message.guild.name}#${message.channel.name}: "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}"`;
        
        logger.info(logMessage);

        // Send log to designated channel if configured
        if (config.logging.enabled && config.logging.logChannel) {
            await sendLogMessage(client, config.logging.logChannel, message, logMessage);
        }

        // Optionally send a temporary notification in the channel
        if (config.logging.verbose) {
            const notification = await message.channel.send({
                content: `🗑️ Duplicate message from ${message.author} was automatically deleted.`,
            });

            // Delete notification after 5 seconds
            setTimeout(async () => {
                try {
                    await notification.delete();
                } catch (error) {
                    logger.warn('Failed to delete notification message:', error);
                }
            }, 5000);
        }

    } catch (error) {
        logger.error('Error handling duplicate message:', error);
        
        // If we can't delete the message, log the attempt
        if (error.code === 10008) {
            logger.warn('Message was already deleted');
        } else if (error.code === 50013) {
            logger.error('Missing permissions to delete message in', message.channel.name);
        }
    }
}

/**
 * Send log message to designated log channel
 * @param {Client} client - Discord client
 * @param {string} channelId - Log channel ID
 * @param {Message} originalMessage - Original message that was deleted
 * @param {string} logText - Log message text
 */
async function sendLogMessage(client, channelId, originalMessage, logText) {
    try {
        const logChannel = await client.channels.fetch(channelId);
        
        if (!logChannel) {
            logger.warn(`Log channel ${channelId} not found`);
            return;
        }

        const embed = {
            title: '🗑️ Duplicate Message Deleted',
            color: 0xff9900,
            fields: [
                {
                    name: '👤 User',
                    value: `${originalMessage.author} (${originalMessage.author.tag})`,
                    inline: true
                },
                {
                    name: '📍 Channel',
                    value: `${originalMessage.channel}`,
                    inline: true
                },
                {
                    name: '💬 Content',
                    value: originalMessage.content.length > 1024 
                        ? originalMessage.content.substring(0, 1021) + '...'
                        : originalMessage.content || '*No text content*',
                    inline: false
                }
            ],
            footer: {
                text: `User ID: ${originalMessage.author.id} | Message ID: ${originalMessage.id}`,
            },
            timestamp: new Date().toISOString()
        };

        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        logger.error('Error sending log message:', error);
        
        if (error.code === 10003) {
            logger.warn('Log channel not found, disabling channel logging');
            const config = configManager.getConfig();
            config.logging.logChannel = null;
            configManager.saveConfig(config);
        }
    }
}
