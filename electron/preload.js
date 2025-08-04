const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件选择
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  scanDirectory: (directoryPath) => ipcRenderer.invoke('scan-directory', directoryPath),
  
  // 重命名操作
  previewRename: (data) => ipcRenderer.invoke('preview-rename', data),
  performRename: (data) => ipcRenderer.invoke('perform-rename', data),
  
  // 文件操作
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
  
  // 配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  
  // 进度更新
  onPreviewProgress: (callback) => {
    ipcRenderer.on('preview-progress', callback);
    return () => {
      ipcRenderer.removeAllListeners('preview-progress');
    };
  },
  
  onRenameProgress: (callback) => {
    ipcRenderer.on('rename-progress', callback);
    return () => {
      ipcRenderer.removeAllListeners('rename-progress');
    };
  },
  
  // 移除进度监听器
  removeProgressListeners: () => {
    ipcRenderer.removeAllListeners('preview-progress');
    ipcRenderer.removeAllListeners('rename-progress');
  }
}); 