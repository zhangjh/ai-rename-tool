#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { FileRenamer } from './file-renamer.js';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

// Initialize with config file settings
let finalConfig = { ...config };
const renamer = new FileRenamer(finalConfig);

program
  .name('image-rename-tool')
  .description('Rename image files based on their content using LLM analysis')
  .version('1.0.0')
  .option('-k, --api-key <key>', 'API key (overrides config file and environment variable)')
  .option('-b, --base-url <url>', 'Base URL for API (overrides config file and environment variable)')
  .option('-m, --model-name <name>', 'Model name (overrides config file and environment variable)')
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
      }
      
      const startTime = Date.now();
      const result = await renamer.performRename(directory, options.dryRun);
      
      console.log(chalk.green('\n=== Operation Complete ==='));
      console.log(`Processing time: ${Date.now() - startTime}ms`);
      console.log(`Successfully renamed: ${result.successful.length}`);
      
      if (result.failed.length > 0) {
        console.log(chalk.red(`Failed: ${result.failed.length}`));
        result.failed.forEach(item => {
          console.log(chalk.red(`  - ${item.originalName}: ${item.error}`));
        });
      }
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('scan')
  .description('Scan directory and show all image files with LLM analysis')
  .argument('<directory>', 'Directory path containing images')
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
      
      console.log(chalk.green('\n=== Directory Scan Results ==='));
      console.log(`Found ${results.length} image files:\n`);
      
      results.forEach((item, index) => {
        if (item.error) {
          console.log(`${index + 1}. ${chalk.red(item.originalName)} - Error: ${item.error}`);
        } else {
          console.log(`${index + 1}. ${chalk.cyan(item.originalName)}`);
          if (item.extractedText) {
            console.log(`   Analysis: "${item.extractedText}"`);
          } else {
            console.log(chalk.gray('   No analysis available'));
          }
          if (item.metadata) {
            console.log(`   Size: ${item.metadata.width}x${item.metadata.height}`);
          }
        }
        console.log();
      });
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

function prompt(question) {
  return new Promise((resolve) => {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer);
    });
  });
}

function showConfiguration() {
  console.log(chalk.green('\n=== Current Configuration ==='));
  console.log(`API Key: ${renamer.analyzer.apiKey ? 'Set' : 'Not set'}`);
  console.log(`Base URL: ${renamer.analyzer.baseUrl}`);
  console.log(`Model Name: ${renamer.analyzer.modelName}`);
  console.log(`Supported Formats: ${config.supportedFormats.join(', ')}`);
  console.log(`Max Filename Length: ${config.maxFilenameLength}`);
  console.log(`Temperature: ${config.temperature}`);
  console.log(`Max Tokens: ${config.maxTokens}`);
  console.log(`Enable Logging: ${config.enableLogging}`);
  console.log(`Skip Corrupted Images: ${config.skipCorruptedImages}`);
  console.log(`Fallback to Timestamp: ${config.fallbackToTimestamp}`);
  console.log('\n=== Custom Prompts ===');
  Object.keys(config.customPrompts).forEach(key => {
    console.log(`${key}: ${config.customPrompts[key].split('\n')[0]}...`);
  });
}

// Handle global options
program.parseAsync().catch(err => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});
