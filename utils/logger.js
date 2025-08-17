const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.logFile = path.join(this.logDir, 'bot.log');
        this.maxLogSize = 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = 5;
        
        this.ensureLogDirectory();
    }

    /**
     * Ensure log directory exists
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Get formatted timestamp
     * @returns {string} - Formatted timestamp
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Format log message
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {any} data - Additional data to log
     * @returns {string} - Formatted log message
     */
    formatMessage(level, message, data) {
        const timestamp = this.getTimestamp();
        let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (data !== undefined) {
            if (data instanceof Error) {
                formattedMessage += `\n${data.stack}`;
            } else if (typeof data === 'object') {
                formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
            } else {
                formattedMessage += ` ${data}`;
            }
        }
        
        return formattedMessage;
    }

    /**
     * Write log to file
     * @param {string} message - Formatted log message
     */
    writeToFile(message) {
        try {
            // Check if log rotation is needed
            if (fs.existsSync(this.logFile)) {
                const stats = fs.statSync(this.logFile);
                if (stats.size > this.maxLogSize) {
                    this.rotateLog();
                }
            }

            fs.appendFileSync(this.logFile, message + '\n', 'utf8');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * Rotate log files
     */
    rotateLog() {
        try {
            // Move existing log files
            for (let i = this.maxLogFiles - 1; i > 0; i--) {
                const currentFile = `${this.logFile}.${i}`;
                const nextFile = `${this.logFile}.${i + 1}`;
                
                if (fs.existsSync(currentFile)) {
                    if (i === this.maxLogFiles - 1) {
                        fs.unlinkSync(currentFile); // Delete oldest log
                    } else {
                        fs.renameSync(currentFile, nextFile);
                    }
                }
            }

            // Move current log to .1
            if (fs.existsSync(this.logFile)) {
                fs.renameSync(this.logFile, `${this.logFile}.1`);
            }
        } catch (error) {
            console.error('Failed to rotate log files:', error);
        }
    }

    /**
     * Log info message
     * @param {string} message - Log message
     * @param {any} data - Additional data
     */
    info(message, data) {
        const formattedMessage = this.formatMessage('info', message, data);
        console.log(formattedMessage);
        this.writeToFile(formattedMessage);
    }

    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {any} data - Additional data
     */
    warn(message, data) {
        const formattedMessage = this.formatMessage('warn', message, data);
        console.warn(formattedMessage);
        this.writeToFile(formattedMessage);
    }

    /**
     * Log error message
     * @param {string} message - Log message
     * @param {any} data - Additional data
     */
    error(message, data) {
        const formattedMessage = this.formatMessage('error', message, data);
        console.error(formattedMessage);
        this.writeToFile(formattedMessage);
    }

    /**
     * Log debug message
     * @param {string} message - Log message
     * @param {any} data - Additional data
     */
    debug(message, data) {
        const formattedMessage = this.formatMessage('debug', message, data);
        console.debug(formattedMessage);
        this.writeToFile(formattedMessage);
    }

    /**
     * Clear all log files
     */
    clearLogs() {
        try {
            // Remove main log file
            if (fs.existsSync(this.logFile)) {
                fs.unlinkSync(this.logFile);
            }

            // Remove rotated log files
            for (let i = 1; i <= this.maxLogFiles; i++) {
                const logFile = `${this.logFile}.${i}`;
                if (fs.existsSync(logFile)) {
                    fs.unlinkSync(logFile);
                }
            }

            this.info('Log files cleared');
        } catch (error) {
            console.error('Failed to clear log files:', error);
        }
    }

    /**
     * Get log file paths
     * @returns {string[]} - Array of log file paths
     */
    getLogFiles() {
        const logFiles = [];
        
        if (fs.existsSync(this.logFile)) {
            logFiles.push(this.logFile);
        }

        for (let i = 1; i <= this.maxLogFiles; i++) {
            const logFile = `${this.logFile}.${i}`;
            if (fs.existsSync(logFile)) {
                logFiles.push(logFile);
            }
        }

        return logFiles;
    }
}

// Export singleton instance
module.exports = new Logger();
