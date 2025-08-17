const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const configManager = require('../utils/configManager');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Manage whitelist for duplicate detection')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add to whitelist')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type to whitelist')
                        .setRequired(true)
                        .addChoices(
                            { name: 'User', value: 'users' },
                            { name: 'Role', value: 'roles' },
                            { name: 'Channel', value: 'channels' }
                        ))
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID of user/role/channel to whitelist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove from whitelist')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type to remove from whitelist')
                        .setRequired(true)
                        .addChoices(
                            { name: 'User', value: 'users' },
                            { name: 'Role', value: 'roles' },
                            { name: 'Channel', value: 'channels' }
                        ))
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID of user/role/channel to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all whitelisted items'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all whitelist entries')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type to clear')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Users', value: 'users' },
                            { name: 'Roles', value: 'roles' },
                            { name: 'Channels', value: 'channels' },
                            { name: 'All', value: 'all' }
                        )))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild?.id;
        const config = configManager.getConfig(guildId);

        try {
            switch (subcommand) {
                case 'add':
                    await this.handleAdd(interaction, config);
                    break;
                case 'remove':
                    await this.handleRemove(interaction, config);
                    break;
                case 'list':
                    await this.handleList(interaction, config);
                    break;
                case 'clear':
                    await this.handleClear(interaction, config);
                    break;
            }
        } catch (error) {
            logger.error('Error in whitelist command:', error);
            await interaction.reply({
                content: '❌ An error occurred while managing the whitelist',
                ephemeral: true
            });
        }
    },

    async handleAdd(interaction, config) {
        const type = interaction.options.getString('type');
        const id = interaction.options.getString('id');

        if (config.whitelist[type].includes(id)) {
            await interaction.reply({
                content: `❌ ID \`${id}\` is already in the ${type} whitelist`,
                ephemeral: true
            });
            return;
        }

        config.whitelist[type].push(id);
        configManager.saveConfig(config, interaction.guild?.id);

        await interaction.reply({
            content: `✅ Added \`${id}\` to the ${type} whitelist`,
            ephemeral: true
        });

        logger.info(`${interaction.user.tag} added ${id} to ${type} whitelist in guild ${interaction.guild?.id}`);
    },

    async handleRemove(interaction, config) {
        const type = interaction.options.getString('type');
        const id = interaction.options.getString('id');

        const index = config.whitelist[type].indexOf(id);
        if (index === -1) {
            await interaction.reply({
                content: `❌ ID \`${id}\` is not in the ${type} whitelist`,
                ephemeral: true
            });
            return;
        }

        config.whitelist[type].splice(index, 1);
        configManager.saveConfig(config, interaction.guild?.id);

        await interaction.reply({
            content: `✅ Removed \`${id}\` from the ${type} whitelist`,
            ephemeral: true
        });

        logger.info(`${interaction.user.tag} removed ${id} from ${type} whitelist in guild ${interaction.guild?.id}`);
    },

    async handleList(interaction, config) {
        const whitelist = config.whitelist;
        
        const embed = {
            title: '📋 Whitelist Status',
            color: 0x00ff00,
            fields: [
                {
                    name: '👥 Users',
                    value: whitelist.users.length > 0 ? whitelist.users.map(id => `<@${id}>`).join('\n') : 'None',
                    inline: true
                },
                {
                    name: '🏷️ Roles',
                    value: whitelist.roles.length > 0 ? whitelist.roles.map(id => `<@&${id}>`).join('\n') : 'None',
                    inline: true
                },
                {
                    name: '📺 Channels',
                    value: whitelist.channels.length > 0 ? whitelist.channels.map(id => `<#${id}>`).join('\n') : 'None',
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },

    async handleClear(interaction, config) {
        const type = interaction.options.getString('type');

        if (type === 'all') {
            config.whitelist.users = [];
            config.whitelist.roles = [];
            config.whitelist.channels = [];
            await interaction.reply({
                content: '✅ Cleared all whitelist entries',
                ephemeral: true
            });
        } else {
            config.whitelist[type] = [];
            await interaction.reply({
                content: `✅ Cleared all ${type} whitelist entries`,
                ephemeral: true
            });
        }

        configManager.saveConfig(config, interaction.guild?.id);
        logger.info(`${interaction.user.tag} cleared ${type} whitelist in guild ${interaction.guild?.id}`);
    }
};
