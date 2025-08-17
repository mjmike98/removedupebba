const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const CONFIG_DIR = path.join(__dirname, '../configs');
const DEFAULT_CONFIG_FILE = path.join(__dirname, '../config.json');

class ConfigManager {
    constructor() {
        this.guildConfigs = new Map(); // Cache for guild configurations
        this.defaultConfig = null;
    }

    /**
     * Initialize configuration system with defaults
     */
    initConfig() {
        try {
            // Ensure configs directory exists
            if (!fs.existsSync(CONFIG_DIR)) {
                fs.mkdirSync(CONFIG_DIR, { recursive: true });
            }
            
            // Load or create default configuration
            if (!fs.existsSync(DEFAULT_CONFIG_FILE)) {
                logger.info('Default config file not found, creating default configuration');
                this.createDefaultConfig();
            } else {
                this.loadDefaultConfig();
            }
            
            logger.info('Configuration system initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize configuration:', error);
            throw error;
        }
    }

    /**
     * Create default configuration file
     */
    createDefaultConfig() {
        const defaultConfig = this.getDefaultConfigStructure();
        this.saveConfigToFile(DEFAULT_CONFIG_FILE, defaultConfig);
        this.defaultConfig = defaultConfig;
    }

    /**
     * Load default configuration from file
     */
    loadDefaultConfig() {
        try {
            const configData = fs.readFileSync(DEFAULT_CONFIG_FILE, 'utf8');
            this.defaultConfig = JSON.parse(configData);
            this.validateAndMigrateDefaultConfig();
        } catch (error) {
            logger.error('Failed to load default configuration:', error);
            this.createDefaultConfig();
        }
    }

    /**
     * Get default configuration structure
     */
    getDefaultConfigStructure() {
        return {
            enabled: true,
            duplicateDetection: {
                enabled: true,
                timeWindow: 300000, // 5 minutes in milliseconds
                maxDuplicates: 2,
                checkBots: true,
                caseSensitive: false,
                minMessageLength: 3
            },
            whitelist: {
                users: [],
                roles: [],
                channels: []
            },
            logging: {
                enabled: true,
                logChannel: null,
                verbose: false
            },
            rateLimit: {
                enabled: true,
                maxActionsPerMinute: 10
            }
        };
    }

    /**
     * Get configuration for a specific guild
     * @param {string} guildId - Discord guild ID
     * @returns {Object} - Guild configuration
     */
    getConfig(guildId = null) {
        if (!guildId) {
            // Return default config if no guild specified (for backward compatibility)
            return this.defaultConfig ? { ...this.defaultConfig } : this.getDefaultConfigStructure();
        }

        // Check cache first
        if (this.guildConfigs.has(guildId)) {
            return { ...this.guildConfigs.get(guildId) };
        }

        // Load from file or create new config
        const guildConfigFile = path.join(CONFIG_DIR, `${guildId}.json`);
        let guildConfig;

        if (fs.existsSync(guildConfigFile)) {
            try {
                const configData = fs.readFileSync(guildConfigFile, 'utf8');
                guildConfig = JSON.parse(configData);
                this.validateAndMigrateGuildConfig(guildConfig);
            } catch (error) {
                logger.error(`Failed to load guild config for ${guildId}:`, error);
                guildConfig = this.getDefaultConfigStructure();
            }
        } else {
            // Create new config from default
            guildConfig = this.getDefaultConfigStructure();
            logger.info(`Creating new configuration for guild ${guildId}`);
        }

        // Cache and return
        this.guildConfigs.set(guildId, guildConfig);
        return { ...guildConfig };
    }

    /**
     * Validate default configuration and add missing properties
     */
    validateAndMigrateDefaultConfig() {
        const requiredStructure = this.getDefaultConfigStructure();
        let configChanged = this.mergeAndValidateConfig(this.defaultConfig, requiredStructure);

        if (configChanged) {
            this.saveConfigToFile(DEFAULT_CONFIG_FILE, this.defaultConfig);
            logger.info('Default configuration migrated and updated');
        }
    }

    /**
     * Validate guild configuration and add missing properties
     * @param {Object} config - Guild configuration to validate
     */
    validateAndMigrateGuildConfig(config) {
        const requiredStructure = this.getDefaultConfigStructure();
        this.mergeAndValidateConfig(config, requiredStructure);
    }

    /**
     * Merge missing properties and validate ranges
     * @param {Object} target - Target configuration object
     * @param {Object} source - Source configuration structure
     * @returns {boolean} - Whether config was changed
     */
    mergeAndValidateConfig(target, source) {
        let configChanged = false;

        // Helper function to merge missing properties
        const mergeObjects = (tgt, src) => {
            for (const key in src) {
                if (!(key in tgt)) {
                    tgt[key] = src[key];
                    configChanged = true;
                } else if (typeof src[key] === 'object' && src[key] !== null && !Array.isArray(src[key])) {
                    mergeObjects(tgt[key], src[key]);
                }
            }
        };

        mergeObjects(target, source);

        // Validate ranges
        if (target.duplicateDetection.timeWindow < 60000) {
            target.duplicateDetection.timeWindow = 60000;
            configChanged = true;
        }
        
        if (target.duplicateDetection.maxDuplicates < 1) {
            target.duplicateDetection.maxDuplicates = 1;
            configChanged = true;
        }

        if (target.rateLimit.maxActionsPerMinute < 1) {
            target.rateLimit.maxActionsPerMinute = 10;
            configChanged = true;
        }

        return configChanged;
    }

    /**
     * Save configuration for a specific guild
     * @param {Object} config - Configuration object to save
     * @param {string} guildId - Discord guild ID
     */
    saveConfig(config, guildId = null) {
        try {
            if (!guildId) {
                // Save as default config for backward compatibility
                this.defaultConfig = { ...config };
                this.saveConfigToFile(DEFAULT_CONFIG_FILE, this.defaultConfig);
                logger.info('Default configuration saved successfully');
                return;
            }

            // Save guild-specific config
            const guildConfigFile = path.join(CONFIG_DIR, `${guildId}.json`);
            this.guildConfigs.set(guildId, { ...config });
            this.saveConfigToFile(guildConfigFile, config);
            logger.info(`Configuration saved successfully for guild ${guildId}`);
        } catch (error) {
            logger.error('Failed to save configuration:', error);
            throw error;
        }
    }

    /**
     * Save configuration object to file
     * @param {string} filePath - Path to save the configuration
     * @param {Object} config - Configuration object
     */
    saveConfigToFile(filePath, config) {
        const configJson = JSON.stringify(config, null, 2);
        fs.writeFileSync(filePath, configJson, 'utf8');
    }

    /**
     * Reset configuration to defaults for a specific guild
     * @param {string} guildId - Discord guild ID
     */
    resetConfig(guildId = null) {
        if (!guildId) {
            logger.info('Resetting default configuration to defaults');
            this.createDefaultConfig();
            return;
        }

        logger.info(`Resetting configuration to defaults for guild ${guildId}`);
        const defaultConfig = this.getDefaultConfigStructure();
        this.saveConfig(defaultConfig, guildId);
    }

    /**
     * Backup configuration for a specific guild
     * @param {string} guildId - Discord guild ID
     * @returns {string} - Path to backup file
     */
    backupConfig(guildId = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '../backups');
        
        try {
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            if (!guildId) {
                const backupPath = path.join(backupDir, `default.backup.${timestamp}.json`);
                fs.copyFileSync(DEFAULT_CONFIG_FILE, backupPath);
                logger.info(`Default configuration backed up to: ${backupPath}`);
                return backupPath;
            }

            const guildConfigFile = path.join(CONFIG_DIR, `${guildId}.json`);
            const backupPath = path.join(backupDir, `${guildId}.backup.${timestamp}.json`);
            
            if (fs.existsSync(guildConfigFile)) {
                fs.copyFileSync(guildConfigFile, backupPath);
                logger.info(`Guild ${guildId} configuration backed up to: ${backupPath}`);
                return backupPath;
            } else {
                logger.warn(`No configuration file found for guild ${guildId} to backup`);
                return null;
            }
        } catch (error) {
            logger.error('Failed to backup configuration:', error);
            throw error;
        }
    }

    /**
     * Get list of all configured guilds
     * @returns {string[]} - Array of guild IDs that have configurations
     */
    getConfiguredGuilds() {
        const guilds = [];
        
        if (fs.existsSync(CONFIG_DIR)) {
            const files = fs.readdirSync(CONFIG_DIR);
            for (const file of files) {
                if (file.endsWith('.json') && file !== 'default.json') {
                    const guildId = file.replace('.json', '');
                    guilds.push(guildId);
                }
            }
        }
        
        return guilds;
    }

    /**
     * Delete configuration for a specific guild
     * @param {string} guildId - Discord guild ID
     */
    deleteGuildConfig(guildId) {
        try {
            const guildConfigFile = path.join(CONFIG_DIR, `${guildId}.json`);
            
            if (fs.existsSync(guildConfigFile)) {
                fs.unlinkSync(guildConfigFile);
                logger.info(`Deleted configuration for guild ${guildId}`);
            }
            
            // Remove from cache
            this.guildConfigs.delete(guildId);
        } catch (error) {
            logger.error(`Failed to delete configuration for guild ${guildId}:`, error);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new ConfigManager();
