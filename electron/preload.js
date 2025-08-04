const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件选择
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // 重命名操作
  previewRename: (data) => ipcRenderer.invoke('preview-rename', data),
  performRename: (data) => ipcRenderer.invoke('perform-rename', data),
  
  // 文件操作
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
  
  // 配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  
  // 进度更新
  onProgress: (callback) => {
    ipcRenderer.on('progress-update', callback);
    return () => {
      ipcRenderer.removeAllListeners('progress-update');
    };
  }
}); 