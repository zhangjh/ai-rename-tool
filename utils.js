import chalk from 'chalk';

export const logger = {
  info: (message) => console.log(chalk.blue('ℹ') + ` ${message}`),
  success: (message) => console.log(chalk.green('✓') + ` ${message}`),
  warning: (message) => console.log(chalk.yellow('⚠') + ` ${message}`),
  error: (message) => console.log(chalk.red('✗') + ` ${message}`),
};

export const validators = {
  isDirectory: async (path) => {
    try {
      const stats = await import('fs').then(fs => fs.stat(path));
      return stats.isDirectory();
    } catch {
      return false;
    }
  },
  
  isValidPath: (path) => {
    return typeof path === 'string' && path.length > 0;
  }
};

export const formatters = {
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};