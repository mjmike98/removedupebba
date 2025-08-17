const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const configManager = require('../utils/configManager');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Configure bot settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('timewindow')
                .setDescription('Set the time window for duplicate detection (in seconds)')
                .addIntegerOption(option =>
                    option.setName('seconds')
                        .setDescription('Time window in seconds (60-3600)')
                        .setRequired(true)
                        .setMinValue(60)
                        .setMaxValue(3600)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('maxduplicates')
                .setDescription('Set maximum allowed duplicates before deletion')
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Maximum duplicates (1-10)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('checkbots')
                .setDescription('Toggle checking bot messages for duplicates')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Check bot messages')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('casesensitive')
                .setDescription('Toggle case sensitive duplicate detection')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Case sensitive detection')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('minlength')
                .setDescription('Set minimum message length for duplicate detection')
                .addIntegerOption(option =>
                    option.setName('length')
                        .setDescription('Minimum message length (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('logchannel')
                .setDescription('Set the logging channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for logging moderation actions')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ratelimit')
                .setDescription('Set rate limit for bot actions per minute')
                .addIntegerOption(option =>
                    option.setName('actions')
                        .setDescription('Max actions per minute (1-60)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(60)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild?.id;
        const config = configManager.getConfig(guildId);

        try {
            switch (subcommand) {
                case 'timewindow':
                    const seconds = interaction.options.getInteger('seconds');
                    config.duplicateDetection.timeWindow = seconds * 1000;
                    await interaction.reply({
                        content: `✅ Time window set to **${seconds} seconds**`,
                        ephemeral: true
                    });
                    break;

                case 'maxduplicates':
                    const count = interaction.options.getInteger('count');
                    config.duplicateDetection.maxDuplicates = count;
                    await interaction.reply({
                        content: `✅ Maximum duplicates set to **${count}**`,
                        ephemeral: true
                    });
                    break;

                case 'checkbots':
                    const checkBots = interaction.options.getBoolean('enabled');
                    config.duplicateDetection.checkBots = checkBots;
                    await interaction.reply({
                        content: `✅ Bot message checking **${checkBots ? 'enabled' : 'disabled'}**`,
                        ephemeral: true
                    });
                    break;

                case 'casesensitive':
                    const caseSensitive = interaction.options.getBoolean('enabled');
                    config.duplicateDetection.caseSensitive = caseSensitive;
                    await interaction.reply({
                        content: `✅ Case sensitive detection **${caseSensitive ? 'enabled' : 'disabled'}**`,
                        ephemeral: true
                    });
                    break;

                case 'minlength':
                    const length = interaction.options.getInteger('length');
                    config.duplicateDetection.minMessageLength = length;
                    await interaction.reply({
                        content: `✅ Minimum message length set to **${length} characters**`,
                        ephemeral: true
                    });
                    break;

                case 'logchannel':
                    const channel = interaction.options.getChannel('channel');
                    if (channel) {
                        config.logging.logChannel = channel.id;
                        await interaction.reply({
                            content: `✅ Log channel set to ${channel}`,
                            ephemeral: true
                        });
                    } else {
                        config.logging.logChannel = null;
                        await interaction.reply({
                            content: '✅ Log channel disabled',
                            ephemeral: true
                        });
                    }
                    break;

                case 'ratelimit':
                    const actions = interaction.options.getInteger('actions');
                    config.rateLimit.maxActionsPerMinute = actions;
                    await interaction.reply({
                        content: `✅ Rate limit set to **${actions} actions per minute**`,
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
            logger.info(`${interaction.user.tag} updated setting ${subcommand} in guild ${guildId}`);

        } catch (error) {
            logger.error('Error in settings command:', error);
            await interaction.reply({
                content: '❌ An error occurred while updating settings',
                ephemeral: true
            });
        }
    },
};
