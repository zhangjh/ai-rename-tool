const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { FileRenamer } = require('../file-renamer.js');
const config = require('../config.js');

let mainWindow;
let renamer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // 加载 HTML 文件
  mainWindow.loadFile(path.join(__dirname, '..', 'web-interface', 'index.html'));

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用准备就绪时创建窗口
app.whenReady().then(createWindow);

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC 处理器
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '图像文件', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });

  if (!result.canceled) {
    return result.filePaths;
  }
  return [];
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('preview-rename', async (event, { files, settings }) => {
  try {
    // 更新配置
    const updatedConfig = {
      ...config,
      apiKey: settings.apiKey || config.apiKey,
      modelName: settings.modelName || config.modelName,
      language: settings.language || config.language || 'zh',
      offlineMode: settings.offlineMode !== undefined ? settings.offlineMode : config.offlineMode
    };

    // 创建重命名器实例
    renamer = new FileRenamer(updatedConfig);

    // 处理文件
    const results = [];
    const totalFiles = files.length;
    
    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      
      // 发送进度更新
      const progress = Math.round(((i + 1) / totalFiles) * 100);
      mainWindow.webContents.send('preview-progress', {
        current: i + 1,
        total: totalFiles,
        progress: progress,
        currentFile: path.basename(filePath)
      });
      
      try {
        const text = await renamer.analyzer.extractTextFromImageWithFallback(filePath, settings.language || 'zh');
        const metadata = await renamer.analyzer.getImageMetadata(filePath);
        const suggestedName = renamer.analyzer.generateSuggestedName(text, metadata);
        const newFileName = suggestedName + path.extname(filePath);
        const originalFileName = path.basename(filePath);

        // 检查是否同名
        const isSameName = originalFileName === newFileName;

        results.push({
          originalPath: filePath,
          originalName: originalFileName,
          extractedText: text,
          metadata: metadata,
          suggestedName: newFileName,
          wouldRename: !isSameName,
          isSameName: isSameName
        });
      } catch (error) {
        results.push({
          originalPath: filePath,
          originalName: path.basename(filePath),
          error: error.message,
          wouldRename: false,
          isSameName: false
        });
      }
    }

    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('perform-rename', async (event, { files, settings, previewResults }) => {
  try {
    // 更新配置
    const updatedConfig = {
      ...config,
      apiKey: settings.apiKey || config.apiKey,
      modelName: settings.modelName || config.modelName,
      language: settings.language || config.language || 'zh',
      offlineMode: settings.offlineMode !== undefined ? settings.offlineMode : config.offlineMode
    };

    // 创建重命名器实例
    renamer = new FileRenamer(updatedConfig);

    // 执行重命名
    const results = [];
    const totalFiles = files.length;
    let processedCount = 0;
    let skippedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const previewResult = previewResults[i];
      
      // 发送进度更新
      const progress = Math.round(((i + 1) / totalFiles) * 100);
      mainWindow.webContents.send('rename-progress', {
        current: i + 1,
        total: totalFiles,
        progress: progress,
        currentFile: path.basename(filePath),
        processed: processedCount,
        skipped: skippedCount,
        success: successCount,
        failed: failedCount
      });
      
      try {
        // 检查是否需要跳过（同名文件）
        if (previewResult && previewResult.isSameName) {
          skippedCount++;
          results.push({
            originalPath: filePath,
            originalName: path.basename(filePath),
            success: true,
            skipped: true,
            reason: '文件名相同，跳过处理'
          });
          continue;
        }

        // 使用预览结果中的建议名称
        let suggestedName;
        if (previewResult && previewResult.suggestedName) {
          suggestedName = previewResult.suggestedName;
        } else {
          // 如果没有预览结果，重新分析
          const text = await renamer.analyzer.extractTextFromImageWithFallback(filePath, settings.language || 'zh');
          const metadata = await renamer.analyzer.getImageMetadata(filePath);
          suggestedName = renamer.analyzer.generateSuggestedName(text, metadata) + path.extname(filePath);
        }

        const dir = path.dirname(filePath);
        const newPath = path.join(dir, suggestedName);

        // 检查目标文件是否已存在
        try {
          await fs.access(newPath);
          // 文件已存在，跳过
          skippedCount++;
          results.push({
            originalPath: filePath,
            originalName: path.basename(filePath),
            success: true,
            skipped: true,
            reason: '目标文件已存在，跳过处理'
          });
          continue;
        } catch {
          // 文件不存在，可以重命名
        }

        // 重命名文件
        await renamer.renameSingleFile(filePath, suggestedName);
        successCount++;
        processedCount++;

        results.push({
          originalPath: filePath,
          newPath: newPath,
          originalName: path.basename(filePath),
          newName: suggestedName,
          success: true,
          skipped: false
        });
      } catch (error) {
        failedCount++;
        processedCount++;
        results.push({
          originalPath: filePath,
          originalName: path.basename(filePath),
          error: error.message,
          success: false,
          skipped: false
        });
      }
    }

    return { 
      success: true, 
      results,
      summary: {
        total: totalFiles,
        processed: processedCount,
        skipped: skippedCount,
        success: successCount,
        failed: failedCount
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-file-location', async (event, filePath) => {
  try {
    await shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-config', () => {
  return config;
});

ipcMain.handle('scan-directory', async (event, directoryPath) => {
  try {
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'];
    const files = await fs.readdir(directoryPath);

    const imageFiles = [];
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          imageFiles.push(filePath);
        }
      }
    }

    return { success: true, files: imageFiles };
  } catch (error) {
    return { success: false, error: error.message };
  }
}); 