const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
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
      offlineMode: settings.offlineMode === 'true'
    };

    // 创建重命名器实例
    renamer = new FileRenamer(updatedConfig);

    // 处理文件
    const results = [];
    for (const filePath of files) {
      try {
        const text = await renamer.analyzer.extractTextFromImageWithFallback(filePath);
        const metadata = await renamer.analyzer.getImageMetadata(filePath);
        const suggestedName = renamer.analyzer.generateSuggestedName(text, metadata);
        
        results.push({
          originalPath: filePath,
          originalName: filePath.split(/[/\\]/).pop(),
          extractedText: text,
          metadata: metadata,
          suggestedName: suggestedName + (filePath.includes('.') ? '.' + filePath.split('.').pop() : ''),
          wouldRename: true
        });
      } catch (error) {
        results.push({
          originalPath: filePath,
          originalName: filePath.split(/[/\\]/).pop(),
          error: error.message,
          wouldRename: false
        });
      }
    }

    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('perform-rename', async (event, { files, settings }) => {
  try {
    // 更新配置
    const updatedConfig = {
      ...config,
      apiKey: settings.apiKey || config.apiKey,
      modelName: settings.modelName || config.modelName,
      offlineMode: settings.offlineMode === 'true'
    };

    // 创建重命名器实例
    renamer = new FileRenamer(updatedConfig);

    // 执行重命名
    const results = [];
    for (const filePath of files) {
      try {
        const text = await renamer.analyzer.extractTextFromImageWithFallback(filePath);
        const metadata = await renamer.analyzer.getImageMetadata(filePath);
        const suggestedName = renamer.analyzer.generateSuggestedName(text, metadata);
        
        const dir = filePath.substring(0, filePath.lastIndexOf('/') + 1);
        const ext = filePath.includes('.') ? '.' + filePath.split('.').pop() : '';
        const newPath = dir + suggestedName + ext;
        
        // 重命名文件
        await renamer.renameSingleFile(filePath, suggestedName + ext);
        
        results.push({
          originalPath: filePath,
          newPath: newPath,
          success: true
        });
      } catch (error) {
        results.push({
          originalPath: filePath,
          error: error.message,
          success: false
        });
      }
    }

    return { success: true, results };
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