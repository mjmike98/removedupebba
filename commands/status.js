const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Show current bot status and configuration')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, client) {
        const guildId = interaction.guild?.id;
        const config = configManager.getConfig(guildId);
        const cacheSize = client.messageCache ? client.messageCache.size : 0;

        const embed = {
            title: '🤖 Bot Status',
            color: config.enabled ? 0x00ff00 : 0xff0000,
            fields: [
                {
                    name: '🔧 General Settings',
                    value: [
                        `**Bot Status:** ${config.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                        `**Duplicate Detection:** ${config.duplicateDetection.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                        `**Logging:** ${config.logging.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                        `**Rate Limiting:** ${config.rateLimit.enabled ? '✅ Enabled' : '❌ Disabled'}`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🔍 Duplicate Detection',
                    value: [
                        `**Time Window:** ${config.duplicateDetection.timeWindow / 1000}s`,
                        `**Max Duplicates:** ${config.duplicateDetection.maxDuplicates}`,
                        `**Check Bots:** ${config.duplicateDetection.checkBots ? 'Yes' : 'No'}`,
                        `**Case Sensitive:** ${config.duplicateDetection.caseSensitive ? 'Yes' : 'No'}`,
                        `**Min Length:** ${config.duplicateDetection.minMessageLength} chars`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📊 Statistics',
                    value: [
                        `**Cached Messages:** ${cacheSize}`,
                        `**Uptime:** ${this.formatUptime(client.uptime)}`,
                        `**Guilds:** ${client.guilds.cache.size}`,
                        `**Rate Limit:** ${config.rateLimit.maxActionsPerMinute}/min`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📝 Logging',
                    value: [
                        `**Log Channel:** ${config.logging.logChannel ? `<#${config.logging.logChannel}>` : 'Not set'}`,
                        `**Verbose Mode:** ${config.logging.verbose ? 'Yes' : 'No'}`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📋 Whitelist Summary',
                    value: [
                        `**Users:** ${config.whitelist.users.length}`,
                        `**Roles:** ${config.whitelist.roles.length}`,
                        `**Channels:** ${config.whitelist.channels.length}`
                    ].join('\n'),
                    inline: true
                }
            ],
            footer: {
                text: `Bot Version: 1.0.0 | Node.js ${process.version}`,
                icon_url: client.user?.displayAvatarURL()
            },
            timestamp: new Date().toISOString()
        };

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },

    formatUptime(uptime) {
        if (!uptime) return 'Unknown';
        
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
};
