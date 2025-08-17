const logger = require('./logger');

class DuplicateDetector {
    constructor(client) {
        this.client = client;
        this.messageCache = client.messageCache;
        this.actionCounter = new Map(); // For rate limiting
    }

    /**
     * Check if a message is a duplicate and should be deleted
     * @param {Message} message - The Discord message object
     * @param {Object} config - Bot configuration
     * @returns {boolean} - Whether the message should be deleted
     */
    isDuplicate(message, config) {
        if (!config.enabled || !config.duplicateDetection.enabled) {
            return false;
        }

        // Skip if message is too short
        if (message.content.length < config.duplicateDetection.minMessageLength) {
            return false;
        }

        // Skip bot messages if not configured to check them
        if (message.author.bot && !config.duplicateDetection.checkBots) {
            return false;
        }

        // Check whitelist
        if (this.isWhitelisted(message, config)) {
            return false;
        }

        // Rate limiting check
        if (config.rateLimit.enabled && this.isRateLimited(config)) {
            logger.warn('Rate limit reached, skipping duplicate check');
            return false;
        }

        const now = Date.now();
        const timeWindow = config.duplicateDetection.timeWindow;
        const maxDuplicates = config.duplicateDetection.maxDuplicates;
        
        // Clean old messages from cache
        this.cleanOldMessages(now, timeWindow);

        // Prepare message content for comparison
        let content = message.content;
        if (!config.duplicateDetection.caseSensitive) {
            content = content.toLowerCase();
        }

        // Generate cache key
        const cacheKey = `${message.guild.id}_${message.channel.id}_${content}`;
        
        // Get existing entries for this content
        const existing = this.messageCache.get(cacheKey) || [];
        
        // Filter recent messages
        const recentMessages = existing.filter(entry => 
            now - entry.timestamp <= timeWindow
        );

        // Add current message
        recentMessages.push({
            messageId: message.id,
            authorId: message.author.id,
            timestamp: now
        });

        // Update cache
        this.messageCache.set(cacheKey, recentMessages);

        // Check if this exceeds the duplicate limit
        const isDuplicate = recentMessages.length > maxDuplicates;

        if (isDuplicate) {
            this.incrementActionCounter();
            logger.info(`Duplicate detected: "${content.substring(0, 50)}..." by ${message.author.tag} in ${message.guild.name}#${message.channel.name}`);
        }

        return isDuplicate;
    }

    /**
     * Check if message author/channel is whitelisted
     * @param {Message} message - The Discord message object
     * @param {Object} config - Bot configuration
     * @returns {boolean} - Whether the message is whitelisted
     */
    isWhitelisted(message, config) {
        const whitelist = config.whitelist;

        // Check user whitelist
        if (whitelist.users.includes(message.author.id)) {
            return true;
        }

        // Check channel whitelist
        if (whitelist.channels.includes(message.channel.id)) {
            return true;
        }

        // Check role whitelist
        if (message.member && message.member.roles.cache.some(role => 
            whitelist.roles.includes(role.id)
        )) {
            return true;
        }

        return false;
    }

    /**
     * Check if rate limit is exceeded
     * @param {Object} config - Bot configuration
     * @returns {boolean} - Whether rate limit is exceeded
     */
    isRateLimited(config) {
        const now = Date.now();
        const minute = Math.floor(now / 60000);
        const currentCount = this.actionCounter.get(minute) || 0;
        
        return currentCount >= config.rateLimit.maxActionsPerMinute;
    }

    /**
     * Increment action counter for rate limiting
     */
    incrementActionCounter() {
        const now = Date.now();
        const minute = Math.floor(now / 60000);
        const currentCount = this.actionCounter.get(minute) || 0;
        
        this.actionCounter.set(minute, currentCount + 1);
        
        // Clean old counter entries
        for (const [key] of this.actionCounter) {
            if (key < minute - 5) { // Keep last 5 minutes
                this.actionCounter.delete(key);
            }
        }
    }

    /**
     * Clean old messages from cache
     * @param {number} now - Current timestamp
     * @param {number} timeWindow - Time window in milliseconds
     */
    cleanOldMessages(now, timeWindow) {
        for (const [key, messages] of this.messageCache) {
            const recentMessages = messages.filter(entry => 
                now - entry.timestamp <= timeWindow
            );
            
            if (recentMessages.length === 0) {
                this.messageCache.delete(key);
            } else if (recentMessages.length !== messages.length) {
                this.messageCache.set(key, recentMessages);
            }
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        let totalMessages = 0;
        let totalKeys = this.messageCache.size;

        for (const messages of this.messageCache.values()) {
            totalMessages += messages.length;
        }

        return {
            totalKeys,
            totalMessages,
            memoryUsage: process.memoryUsage()
        };
    }

    /**
     * Clear message cache
     */
    clearCache() {
        this.messageCache.clear();
        this.actionCounter.clear();
        logger.info('Message cache cleared');
    }
}

module.exports = DuplicateDetector;
