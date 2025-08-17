# Overview

This is a Discord bot designed to detect and automatically delete duplicate messages within Discord servers. The bot monitors messages in real-time and removes duplicates based on configurable parameters like time windows, content similarity, and user permissions. It includes comprehensive logging, rate limiting, and whitelist functionality to provide administrators with granular control over duplicate message management.

## Recent Changes (August 16, 2025)
- **Per-Guild Configuration System**: Implemented separate configuration files for each Discord server to prevent settings from one server affecting another
- **Configuration Migration**: Updated all command handlers and core systems to use guild-specific configurations
- **File Structure**: Changed from single `config.json` to `configs/` directory with individual guild files

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Architecture Pattern
The bot follows a modular event-driven architecture using Discord.js v14, organizing functionality into distinct components:

- **Event System**: Handles Discord events (message creation, bot ready state) through dedicated event handlers
- **Command System**: Implements slash commands for configuration and management using Discord's interaction API
- **Utility Modules**: Provides core functionality through specialized utility classes for duplicate detection, configuration management, and logging

## Message Processing Pipeline
The duplicate detection system operates through a multi-stage pipeline:

1. **Message Filtering**: Filters out bot messages (optional), DMs, and messages below minimum length
2. **Whitelist Checking**: Bypasses duplicate detection for whitelisted users, roles, or channels
3. **Content Normalization**: Processes message content for comparison (case sensitivity handling)
4. **Cache-Based Detection**: Maintains an in-memory cache of recent messages with timestamps
5. **Rate Limiting**: Prevents excessive processing through configurable action limits

## Configuration Management
Uses a per-guild JSON-based configuration system with hot-reloading capabilities:

- **Per-Guild Storage**: Each Discord server has its own configuration file in `configs/` directory (e.g., `configs/1234567890.json`)
- **Default Configuration**: Maintains a global default configuration file for fallback values
- **Runtime Modification**: Allows real-time configuration changes through slash commands that only affect the current server
- **Validation**: Implements bounds checking for all configurable parameters
- **Automatic Migration**: Creates new guild configurations from defaults when first accessed

## Memory Management
Implements automatic cache cleanup to prevent memory leaks:

- **Time-Based Expiry**: Removes messages older than the configured time window
- **Periodic Cleanup**: Runs cleanup tasks every 30 minutes
- **Cache Size Monitoring**: Tracks cache statistics for performance monitoring

## Logging Architecture
Provides comprehensive logging with multiple output streams:

- **File Logging**: Maintains rotating log files with size and count limits
- **Console Output**: Real-time logging to stdout for development
- **Discord Logging**: Optional in-channel logging for administrative visibility
- **Log Rotation**: Automatic log file rotation when size limits are exceeded

# External Dependencies

## Discord.js Framework
- **Version**: 14.21.0
- **Purpose**: Primary Discord API interaction library
- **Features Used**: Gateway intents, slash commands, message handling, permissions

## Node.js Runtime
- **Built-in Modules**: 
  - `fs` for file system operations
  - `path` for cross-platform path handling
  - No external database dependencies (uses in-memory caching)

## Discord API Integration
- **Gateway Connection**: Maintains persistent WebSocket connection for real-time events
- **Slash Commands**: Registers and handles Discord's native command system
- **Permissions System**: Integrates with Discord's role-based permission model
- **Message Management**: Uses Discord's message deletion API with proper error handling

## File System Dependencies
- **Configuration Storage**: Persistent JSON-based configuration
- **Log Management**: File-based logging with automatic rotation
- **No Database**: Uses in-memory data structures for temporary storage