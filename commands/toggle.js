const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const configManager = require('../utils/configManager');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle')
        .setDescription('Toggle bot features on/off')
        .addSubcommand(subcommand =>
            subcommand
                .setName('bot')
                .setDescription('Toggle the entire bot on/off'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('duplicates')
                .setDescription('Toggle duplicate message detection'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('logging')
                .setDescription('Toggle action logging'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ratelimit')
                .setDescription('Toggle rate limiting protection'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild?.id;
        const config = configManager.getConfig(guildId);

        try {
            switch (subcommand) {
                case 'bot':
                    config.enabled = !config.enabled;
                    await interaction.reply({
                        content: `🤖 Bot is now **${config.enabled ? 'enabled' : 'disabled'}**`,
                        ephemeral: true
                    });
                    break;

                case 'duplicates':
                    config.duplicateDetection.enabled = !config.duplicateDetection.enabled;
                    await interaction.reply({
                        content: `🔍 Duplicate detection is now **${config.duplicateDetection.enabled ? 'enabled' : 'disabled'}**`,
                        ephemeral: true
                    });
                    break;

                case 'logging':
                    config.logging.enabled = !config.logging.enabled;
                    await interaction.reply({
                        content: `📝 Logging is now **${config.logging.enabled ? 'enabled' : 'disabled'}**`,
                        ephemeral: true
                    });
                    break;

                case 'ratelimit':
                    config.rateLimit.enabled = !config.rateLimit.enabled;
                    await interaction.reply({
                        content: `⚡ Rate limiting is now **${config.rateLimit.enabled ? 'enabled' : 'disabled'}**`,
                        ephemeral: true
                    });
                    break;

                default:
                    await interaction.reply({
                        content: '❌ Invalid subcommand',
                        ephemeral: true
                    });
                    return;
            }

            configManager.saveConfig(config, guildId);
            logger.info(`${interaction.user.tag} toggled ${subcommand} in guild ${guildId}: ${config.enabled || config.duplicateDetection.enabled || config.logging.enabled || config.rateLimit.enabled}`);

        } catch (error) {
            logger.error('Error in toggle command:', error);
            await interaction.reply({
                content: '❌ An error occurred while updating the configuration',
                ephemeral: true
            });
        }
    },
};
