import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { ImageAnalyzer } from './image-analyzer.js';

export class FileRenamer {
  constructor(config = {}) {
    this.analyzer = new ImageAnalyzer(config);
  }

  async scanDirectory(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      const imageFiles = files.filter(file => this.analyzer.isImageFile(file));
      
      const results = [];
      
      for (const file of imageFiles) {
        const filePath = path.join(dirPath, file);
        try {
          const text = await this.analyzer.extractTextFromImageWithFallback(filePath);
          const metadata = await this.analyzer.getImageMetadata(filePath);
          const suggestedName = this.analyzer.generateSuggestedName(text, metadata);
          
          results.push({
            originalPath: filePath,
            originalName: file,
            extractedText: text,
            metadata: metadata,
            suggestedName: suggestedName + path.extname(file),
            wouldRename: file !== suggestedName + path.extname(file)
          });
        } catch (error) {
          console.log(chalk.yellow(`⚠ Processing ${file} with fallback: ${error.message}`));
          const metadata = await this.analyzer.getImageMetadata(filePath);
          const fallbackName = `image_${metadata?.width}x${metadata?.height}_${Date.now()}`;
          results.push({
            originalPath: filePath,
            originalName: file,
            extractedText: '',
            metadata: metadata,
            suggestedName: fallbackName + path.extname(file),
            wouldRename: file !== fallbackName + path.extname(file)
          });
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Failed to scan directory: ${error.message}`);
    }
  }

  async previewRenaming(dirPath) {
    const results = await this.scanDirectory(dirPath);
    return results.filter(item => !item.error);
  }

  async performRename(dirPath, dryRun = false) {
    const results = await this.scanDirectory(dirPath);
    const successfulRenames = [];
    const failedRenames = [];
    
    for (const item of results) {
      if (item.skipped) {
        continue;
      }
      if (item.error) {
        failedRenames.push(item);
        continue;
      }
      
      if (!item.wouldRename) {
        continue;
      }
      
      try {
        const oldPath = item.originalPath;
        const newPath = path.join(dirPath, item.suggestedName);
        
        if (dryRun) {
          successfulRenames.push({
            ...item,
            newPath: newPath,
            status: 'dry_run'
          });
        } else {
          await fs.rename(oldPath, newPath);
          successfulRenames.push({
            ...item,
            newPath: newPath,
            status: 'renamed'
          });
        }
      } catch (error) {
        failedRenames.push({
          ...item,
          error: error.message
        });
      }
    }
    
    return {
      successful: successfulRenames,
      failed: failedRenames
    };
  }

  async renameSingleFile(filePath, newName) {
    const dir = path.dirname(filePath);
    const newPath = path.join(dir, newName);
    
    try {
      await fs.rename(filePath, newPath);
      return { success: true, newPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
