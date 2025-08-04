#!/usr/bin/env node
const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const { createInterface } = require('readline');
const { FileRenamer } = require('./file-renamer.js');
const config = require('./config.js');

const program = new Command();

// Initialize with config file settings
let finalConfig = { ...config };
if (process.argv.includes('--offline')) {
  finalConfig.offlineMode = true;
}
const renamer = new FileRenamer(finalConfig);

program
  .name('image-rename-tool')
  .description('Rename image files based on their content using LLM analysis')
  .version('1.0.0')
  .option('-k, --api-key <key>', 'API key (overrides config file and environment variable)')
  .option('-b, --base-url <url>', 'Base URL for API (overrides config file and environment variable)')
  .option('-m, --model-name <name>', 'Model name (overrides config file and environment variable)')
  .option('--offline', 'Use offline mode (no AI analysis)')
  .option('--dry-run', 'Show what would be renamed without actually renaming')
  .option('--show-config', 'Show current configuration and exit');

program
  .command('preview')
  .description('Preview what files would be renamed')
  .argument('<directory>', 'Directory path containing images')
  .action(async (directory, options) => {
    // Update configuration with command line options
    if (options.apiKey) renamer.analyzer.apiKey = options.apiKey;
    if (options.baseUrl) renamer.analyzer.baseUrl = options.baseUrl;
    if (options.modelName) renamer.analyzer.modelName = options.modelName;
    
    try {
      const results = await renamer.previewRenaming(directory);
      
      if (results.length === 0) {
        console.log(chalk.yellow('No image files found that would be renamed.'));
        return;
      }
      
      console.log(chalk.green('\n=== Preview of Files to Rename ==='));
      console.log(`Found ${results.length} files that would be renamed:\n`);
      
      results.forEach((item, index) => {
        console.log(`${index + 1}. ${chalk.cyan(item.originalName)} → ${chalk.green(item.suggestedName)}`);
        if (item.extractedText) {
          console.log(`   Analysis: "${item.extractedText}"`);
        }
        console.log();
      });
      
      // Show current configuration
      console.log(chalk.blue('\n=== Current Configuration ==='));
      console.log(`Model: ${renamer.analyzer.modelName}`);
      console.log(`Base URL: ${renamer.analyzer.baseUrl}`);
      console.log(`API Key: ${renamer.analyzer.apiKey ? 'Set' : 'Not set'}`);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('rename')
  .description('Perform the renaming operation')
  .argument('<directory>', 'Directory path containing images')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (directory, options) => {
    // Update configuration with command line options
    if (options.apiKey) renamer.analyzer.apiKey = options.apiKey;
    if (options.baseUrl) renamer.analyzer.baseUrl = options.baseUrl;
    if (options.modelName) renamer.analyzer.modelName = options.modelName;
    
    try {
      const results = await renamer.previewRenaming(directory);
      
      if (results.length === 0) {
        console.log(chalk.yellow('No image files found that would be renamed.'));
        return;
      }
      
      console.log(chalk.green('\n=== Files to be Renamed ==='));
      console.log(`Found ${results.length} files to rename:\n`);
      
      results.forEach((item, index) => {
        console.log(`${index + 1}. ${chalk.cyan(item.originalName)} → ${chalk.green(item.suggestedName)}`);
      });
      
      if (!options.dryRun) {
        console.log();
        if (!options.yes) {
          const response = await prompt('Proceed with renaming? (y/N): ');
          if (response.toLowerCase() !== 'y') {
            console.log(chalk.yellow('Operation cancelled.'));
            return;
          }
        }
        
        console.log(chalk.blue('\n=== Performing Rename Operation ==='));
        const renameResults = await renamer.performRename(directory);
        
        console.log(chalk.green(`\n✅ Rename operation completed!`));
        console.log(`Successfully renamed: ${renameResults.successful.length} files`);
        if (renameResults.failed.length > 0) {
          console.log(chalk.red(`Failed to rename: ${renameResults.failed.length} files`));
          renameResults.failed.forEach(item => {
            console.log(chalk.red(`  - ${item.originalName}: ${item.error}`));
          });
        }
      } else {
        console.log(chalk.blue('\n=== Dry Run Mode ==='));
        console.log('No files were actually renamed. Use --rename to perform the operation.');
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('scan')
  .description('Scan directory and show all image files')
  .argument('<directory>', 'Directory path to scan')
  .action(async (directory, options) => {
    // Update configuration with command line options
    if (options.apiKey) renamer.analyzer.apiKey = options.apiKey;
    if (options.baseUrl) renamer.analyzer.baseUrl = options.baseUrl;
    if (options.modelName) renamer.analyzer.modelName = options.modelName;
    
    try {
      const results = await renamer.scanDirectory(directory);
      
      if (results.length === 0) {
        console.log(chalk.yellow('No image files found in the directory.'));
        return;
      }
      
      console.log(chalk.green('\n=== Image Files Found ==='));
      console.log(`Found ${results.length} image files:\n`);
      
      results.forEach((item, index) => {
        console.log(`${index + 1}. ${chalk.cyan(item.originalName)}`);
        if (item.extractedText) {
          console.log(`   Analysis: "${item.extractedText}"`);
        }
        if (item.metadata) {
          console.log(`   Size: ${item.metadata.size} bytes`);
        }
        console.log();
      });
      
      // Show current configuration
      console.log(chalk.blue('\n=== Current Configuration ==='));
      console.log(`Model: ${renamer.analyzer.modelName}`);
      console.log(`Base URL: ${renamer.analyzer.baseUrl}`);
      console.log(`API Key: ${renamer.analyzer.apiKey ? 'Set' : 'Not set'}`);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Helper function to prompt user for input
function prompt(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Show configuration function
function showConfiguration() {
  console.log(chalk.blue('\n=== Current Configuration ==='));
  console.log(`API Key: ${config.apiKey ? 'Set' : 'Not set'}`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Model Name: ${config.modelName}`);
  console.log(`Image Quality: ${config.imageQuality}`);
  console.log(`Supported Formats: ${config.supportedFormats.join(', ')}`);
  console.log(`Max Filename Length: ${config.maxFilenameLength}`);
  console.log(`Temperature: ${config.temperature}`);
  console.log(`Max Tokens: ${config.maxTokens}`);
  console.log(`Enable Logging: ${config.enableLogging}`);
  console.log(`Skip Corrupted Images: ${config.skipCorruptedImages}`);
  console.log(`Fallback to Timestamp: ${config.fallbackToTimestamp}`);
  console.log(`Offline Mode: ${config.offlineMode || false}`);
}

// Handle --show-config option
if (process.argv.includes('--show-config')) {
  showConfiguration();
  process.exit(0);
}

// Parse command line arguments
program.parse();
