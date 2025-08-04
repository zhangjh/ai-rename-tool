// 全局变量
let selectedFiles = [];
let previewResults = [];

// DOM 元素
const uploadSection = document.getElementById('uploadSection');
const fileInput = document.getElementById('fileInput');
const selectFilesBtn = document.getElementById('selectFilesBtn');
const selectFolderBtn = document.getElementById('selectFolderBtn');
const apiKeyInput = document.getElementById('apiKey');
const modelNameSelect = document.getElementById('modelName');
const languageSelect = document.getElementById('language');
// 移除离线模式选择器
const previewSection = document.getElementById('previewSection');
const previewBtn = document.getElementById('previewBtn');
const previewLoading = document.getElementById('previewLoading');
const fileList = document.getElementById('fileList');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const statusMessage = document.getElementById('statusMessage');
const actionButtons = document.getElementById('actionButtons');
const renameBtn = document.getElementById('renameBtn');
const renameLoading = document.getElementById('renameLoading');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 加载配置
  const config = await window.electronAPI.getConfig();
  apiKeyInput.value = config.apiKey || '';
  modelNameSelect.value = config.modelName || 'gemini-1.5-flash';
  languageSelect.value = config.language || 'zh';
  // 移除离线模式配置
  
  // 绑定事件
  bindEvents();
});

// 绑定事件
function bindEvents() {
  // 文件选择 - 只在点击上传区域但不是按钮时触发
  uploadSection.addEventListener('click', (event) => {
    // 如果点击的是按钮，不触发文件选择
    if (!event.target.classList.contains('upload-btn')) {
      fileInput.click();
    }
  });
  
  // 按钮事件
  selectFilesBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    fileInput.click();
  });
  
  selectFolderBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    selectDirectory();
  });
  
  fileInput.addEventListener('change', handleFileSelect);
  
  // 拖拽上传
  uploadSection.addEventListener('dragover', handleDragOver);
  uploadSection.addEventListener('drop', handleDrop);
  uploadSection.addEventListener('dragleave', handleDragLeave);
  
  // 预览按钮
  previewBtn.addEventListener('click', handlePreview);
  
  // 重命名按钮
  renameBtn.addEventListener('click', handleRename);
}

// 处理文件选择
async function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    selectedFiles = files.map(file => file.path);
    showPreviewSection();
    renderFileList();
  }
}

// 选择文件夹
async function selectDirectory() {
  try {
    // 清除文件输入框状态
    fileInput.value = '';
    
    const directoryPath = await window.electronAPI.selectDirectory();
    if (directoryPath) {
      showStatus('正在扫描文件夹...', 'info');
      
      // 扫描文件夹中的图像文件
      const result = await window.electronAPI.scanDirectory(directoryPath);
      if (result.success && result.files.length > 0) {
        selectedFiles = result.files;
        showPreviewSection();
        renderFileList();
        showStatus(`找到 ${result.files.length} 个图像文件`, 'success');
      } else {
        showStatus('文件夹中没有找到图像文件', 'error');
      }
    }
  } catch (error) {
    showStatus(`选择文件夹失败: ${error.message}`, 'error');
  }
}

// 处理拖拽
function handleDragOver(event) {
  event.preventDefault();
  uploadSection.classList.add('dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  uploadSection.classList.remove('dragover');
}

async function handleDrop(event) {
  event.preventDefault();
  uploadSection.classList.remove('dragover');
  
  const files = Array.from(event.dataTransfer.files);
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length > 0) {
    selectedFiles = imageFiles.map(file => file.path);
    showPreviewSection();
    renderFileList();
  }
}

// 显示预览区域
function showPreviewSection() {
  previewSection.classList.remove('hidden');
  actionButtons.classList.remove('hidden');
}

// 获取文件名（跨平台）
function getFileName(filePath) {
  return filePath.split(/[/\\]/).pop();
}

// 获取目录路径（跨平台）
function getDirPath(filePath) {
  const parts = filePath.split(/[/\\]/);
  parts.pop();
  return parts.join(process.platform === 'win32' ? '\\' : '/');
}

// 渲染文件列表
function renderFileList() {
  fileList.innerHTML = '';
  
  selectedFiles.forEach((filePath, index) => {
    const fileName = getFileName(filePath);
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <div class="file-info">
        <div class="file-icon">🖼️</div>
        <div class="file-details">
          <h4>${fileName}</h4>
          <p title="${filePath}">${filePath}</p>
        </div>
      </div>
      <div class="rename-section">
        <div class="name-comparison">
          <div class="original-name">
            <label>原文件名:</label>
            <span class="name-text">${fileName}</span>
          </div>
          <div class="arrow">→</div>
          <div class="new-name">
            <label>新文件名:</label>
            <input type="text" class="rename-input" id="rename-${index}" placeholder="新文件名将在这里显示">
          </div>
        </div>
      </div>
    `;
    fileList.appendChild(fileItem);
  });
}

// 处理预览
async function handlePreview() {
  if (selectedFiles.length === 0) {
    showStatus('请先选择文件', 'error');
    return;
  }
  
  const settings = getSettings();
  if (!settings.apiKey) {
    showStatus('请输入 API 密钥', 'error');
    return;
  }
  
  setLoading(true, 'preview');
  showStatus('正在生成预览...', 'info');
  
  try {
    const result = await window.electronAPI.previewRename({
      files: selectedFiles,
      settings: settings
    });
    
    if (result.success) {
      previewResults = result.results;
      updateFileListWithPreview();
      showStatus(`预览生成完成，共 ${result.results.length} 个文件`, 'success');
    } else {
      showStatus(`预览失败: ${result.error}`, 'error');
    }
  } catch (error) {
    showStatus(`预览失败: ${error.message}`, 'error');
  } finally {
    setLoading(false, 'preview');
  }
}

// 更新文件列表显示预览
function updateFileListWithPreview() {
  previewResults.forEach((result, index) => {
    const input = document.getElementById(`rename-${index}`);
    if (input) {
      // 清除之前的样式类
      input.classList.remove('success', 'error');
      
      if (result.error) {
        input.value = `错误: ${result.error}`;
        input.classList.add('error');
      } else {
        input.value = result.suggestedName;
        input.classList.add('success');
      }
    }
  });
}

// 处理重命名
async function handleRename() {
  if (previewResults.length === 0) {
    showStatus('请先生成预览', 'error');
    return;
  }
  
  const settings = getSettings();
  setLoading(true, 'rename');
  showProgress(0);
  
  try {
    const result = await window.electronAPI.performRename({
      files: selectedFiles,
      settings: settings
    });
    
    if (result.success) {
      const successCount = result.results.filter(r => r.success).length;
      const failCount = result.results.length - successCount;
      
      showProgress(100);
      showStatus(`重命名完成！成功: ${successCount}, 失败: ${failCount}`, 'success');
      
      // 更新文件列表显示结果
      updateFileListWithResults(result.results);
    } else {
      showStatus(`重命名失败: ${result.error}`, 'error');
    }
  } catch (error) {
    showStatus(`重命名失败: ${error.message}`, 'error');
  } finally {
    setLoading(false, 'rename');
    hideProgress();
  }
}

// 更新文件列表显示结果
function updateFileListWithResults(results) {
  results.forEach((result, index) => {
    const input = document.getElementById(`rename-${index}`);
    if (input) {
      // 清除之前的样式类
      input.classList.remove('success', 'error');
      
      if (result.success) {
        input.value = `✓ 重命名成功`;
        input.classList.add('success');
      } else {
        input.value = `✗ 失败: ${result.error}`;
        input.classList.add('error');
      }
    }
  });
}

// 获取设置
function getSettings() {
  return {
    apiKey: apiKeyInput.value,
    modelName: modelNameSelect.value,
    language: languageSelect.value
  };
}

// 设置加载状态
function setLoading(loading, type) {
  if (type === 'preview') {
    previewBtn.disabled = loading;
    previewLoading.classList.toggle('hidden', !loading);
  } else if (type === 'rename') {
    renameBtn.disabled = loading;
    renameLoading.classList.toggle('hidden', !loading);
  }
}

// 显示状态消息
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
  statusMessage.classList.remove('hidden');
  
  if (type === 'success') {
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 5000);
  }
}

// 显示进度条
function showProgress(percent) {
  progressBar.classList.remove('hidden');
  progressFill.style.width = `${percent}%`;
}

// 隐藏进度条
function hideProgress() {
  progressBar.classList.add('hidden');
  progressFill.style.width = '0%';
}

// 重置应用
function resetApp() {
  selectedFiles = [];
  previewResults = [];
  fileInput.value = '';
  fileList.innerHTML = '';
  previewSection.classList.add('hidden');
  actionButtons.classList.add('hidden');
  statusMessage.classList.add('hidden');
  progressBar.classList.add('hidden');
  
  // 重置输入框
  const inputs = document.querySelectorAll('.rename-input');
  inputs.forEach(input => {
    input.value = '';
    input.style.color = '';
  });
} 