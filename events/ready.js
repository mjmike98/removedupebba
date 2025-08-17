const logger = require('../utils/logger');
const configManager = require('../utils/configManager');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
        logger.info(`Bot is serving ${client.guilds.cache.size} guild(s)`);
        
        // Set bot activity status
        client.user.setActivity('for duplicate messages', { type: 'WATCHING' });
        
        // Log configuration status (using default config for general status)
        const defaultConfig = configManager.getConfig();
        logger.info(`Bot status: ${defaultConfig.enabled ? 'Enabled' : 'Disabled'}`);
        logger.info(`Duplicate detection: ${defaultConfig.duplicateDetection.enabled ? 'Enabled' : 'Disabled'}`);
        
        // Log guild information
        client.guilds.cache.forEach(guild => {
            logger.info(`Connected to guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
        });

        // Initialize message cache cleanup interval
        startCacheCleanup(client);
        
        logger.info('Bot initialization complete');
    },
};

/**
 * Start periodic cache cleanup to prevent memory leaks
 * @param {Client} client - Discord client
 */
function startCacheCleanup(client) {
    // Clean cache every 30 minutes
    setInterval(() => {
        const now = Date.now();
        
        // Get all guild configs for cleanup - use a reasonable default timeWindow for cache cleanup
        const defaultTimeWindow = 300000; // 5 minutes default
        
        let cleanedEntries = 0;
        let totalEntries = 0;

        for (const [key, messages] of client.messageCache) {
            totalEntries++;
            const recentMessages = messages.filter(entry => 
                now - entry.timestamp <= defaultTimeWindow
            );
            
            if (recentMessages.length === 0) {
                client.messageCache.delete(key);
                cleanedEntries++;
            } else if (recentMessages.length !== messages.length) {
                client.messageCache.set(key, recentMessages);
            }
        }

        if (cleanedEntries > 0) {
            logger.info(`Cache cleanup: removed ${cleanedEntries} expired entries (${totalEntries - cleanedEntries} remaining)`);
        }

        // Log memory usage 
        const memUsage = process.memoryUsage();
        logger.debug(`Memory usage: RSS ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        
    }, 30 * 60 * 1000); // 30 minutes

    logger.info('Cache cleanup interval started (30 minutes)');
}
