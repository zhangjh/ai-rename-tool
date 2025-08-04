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
const offlineModeSelect = document.getElementById('offlineMode');
const passwordToggle = document.getElementById('passwordToggle');
const previewSection = document.getElementById('previewSection');
const previewBtn = document.getElementById('previewBtn');
const previewLoading = document.getElementById('previewLoading');
const fileList = document.getElementById('fileList');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressDetails = document.getElementById('progressDetails');
const progressCurrent = document.getElementById('progressCurrent');
const progressTotal = document.getElementById('progressTotal');
const progressStats = document.getElementById('progressStats');
const currentFile = document.getElementById('currentFile');
const progressPercentage = document.getElementById('progressPercentage');
const statusMessage = document.getElementById('statusMessage');
const actionButtons = document.getElementById('actionButtons');
const renameBtn = document.getElementById('renameBtn');
const renameLoading = document.getElementById('renameLoading');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 加载配置
  const config = await window.electronAPI.getConfig();
  apiKeyInput.value = config.apiKey || '';
  modelNameSelect.value = config.modelName || 'glm-4v-flash';
  languageSelect.value = config.language || 'zh';
  offlineModeSelect.value = config.offlineMode || 'false';
  
  // 绑定事件
  bindEvents();
  
  // 初始化离线模式状态
  updateOfflineModeUI();
  
  // 设置进度监听器
  setupProgressListeners();
});

// 设置进度监听器
function setupProgressListeners() {
  // 预览进度监听
  window.electronAPI.onPreviewProgress((event, data) => {
    updateProgress(data, 'preview');
  });
  
  // 重命名进度监听
  window.electronAPI.onRenameProgress((event, data) => {
    updateProgress(data, 'rename');
  });
}

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
  
  // 拖拽功能已移除
  
  // 预览按钮
  previewBtn.addEventListener('click', handlePreview);
  
  // 重命名按钮
  renameBtn.addEventListener('click', handleRename);
  
  // 离线模式切换
  offlineModeSelect.addEventListener('change', updateOfflineModeUI);
  
  // 密钥显示/隐藏切换
  passwordToggle.addEventListener('click', togglePasswordVisibility);
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

// 拖拽功能已移除

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
  parts.pop(); // 移除文件名，只保留目录路径
  
  // 检测路径分隔符类型
  const isWindows = filePath.includes('\\');
  return parts.join(isWindows ? '\\' : '/');
}

// 截断路径显示
function truncatePath(path, maxLength = 50) {
  if (path.length <= maxLength) {
    return path;
  }
  
  // 从开头截断，保留结尾部分
  const truncated = '...' + path.slice(-(maxLength - 3));
  return truncated;
}

// 渲染文件列表
function renderFileList() {
  fileList.innerHTML = '';
  
  selectedFiles.forEach((filePath, index) => {
    const fileName = getFileName(filePath);
    const dirPath = getDirPath(filePath);
    const truncatedPath = truncatePath(dirPath);
    
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <div class="file-info">
        <div class="file-icon">🖼️</div>
        <div class="file-details">
          <h4>${fileName}</h4>
          <p title="${dirPath}" class="file-path">${truncatedPath}</p>
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
  if (!settings.offlineMode && !settings.apiKey) {
    showStatus('请输入 API 密钥或开启离线模式', 'error');
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
      input.classList.remove('success', 'error', 'same-name');
      
      if (result.error) {
        input.value = `错误: ${result.error}`;
        input.classList.add('error');
      } else if (result.isSameName) {
        input.value = `${result.suggestedName} (同名跳过)`;
        input.classList.add('same-name');
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
  showProgressSection(true);
  
  try {
    const result = await window.electronAPI.performRename({
      files: selectedFiles,
      settings: settings,
      previewResults: previewResults
    });
    
    if (result.success) {
      const summary = result.summary;
      let statusText = `重命名完成！`;
      if (summary.success > 0) statusText += ` 成功: ${summary.success}`;
      if (summary.skipped > 0) statusText += ` 跳过: ${summary.skipped}`;
      if (summary.failed > 0) statusText += ` 失败: ${summary.failed}`;
      
      showStatus(statusText, 'success');
      
      // 更新文件列表显示结果
      updateFileListWithResults(result.results);
    } else {
      showStatus(`重命名失败: ${result.error}`, 'error');
    }
  } catch (error) {
    showStatus(`重命名失败: ${error.message}`, 'error');
  } finally {
    setLoading(false, 'rename');
    setTimeout(() => {
      hideProgressSection();
    }, 2000); // 2秒后隐藏进度条
  }
}

// 更新文件列表显示结果
function updateFileListWithResults(results) {
  results.forEach((result, index) => {
    const input = document.getElementById(`rename-${index}`);
    if (input) {
      // 清除之前的样式类
      input.classList.remove('success', 'error', 'same-name', 'skipped');
      
      if (result.success && result.skipped) {
        input.value = `⏭️ ${result.reason}`;
        input.classList.add('skipped');
      } else if (result.success) {
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
    language: languageSelect.value,
    offlineMode: offlineModeSelect.value === 'true'
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

// 显示进度区域
function showProgressSection(show = true) {
  if (show) {
    progressSection.classList.remove('hidden');
  } else {
    progressSection.classList.add('hidden');
  }
}

// 隐藏进度区域
function hideProgressSection() {
  progressSection.classList.add('hidden');
  progressFill.style.width = '0%';
  progressPercentage.textContent = '0%';
}

// 更新进度显示
function updateProgress(data, type) {
  const { current, total, progress, currentFile: fileName } = data;
  
  // 更新进度条
  progressFill.style.width = `${progress}%`;
  progressPercentage.textContent = `${progress}%`;
  
  // 更新进度文字
  if (type === 'preview') {
    progressText.textContent = '正在生成预览...';
  } else if (type === 'rename') {
    progressText.textContent = '正在重命名文件...';
    
    // 显示重命名统计
    if (data.processed !== undefined) {
      const statsText = `已处理: ${data.processed}, 跳过: ${data.skipped}, 成功: ${data.success}, 失败: ${data.failed}`;
      progressStats.textContent = statsText;
    }
  }
  
  // 更新进度数字
  progressCurrent.textContent = current;
  progressTotal.textContent = total;
  
  // 更新当前文件
  currentFile.textContent = `当前文件: ${fileName || '无'}`;
}

// 显示进度条（兼容旧代码）
function showProgress(percent) {
  showProgressSection(true);
  progressFill.style.width = `${percent}%`;
  progressPercentage.textContent = `${percent}%`;
}

// 隐藏进度条（兼容旧代码）
function hideProgress() {
  hideProgressSection();
}

// 切换密钥显示/隐藏
function togglePasswordVisibility() {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  passwordToggle.textContent = isPassword ? '🙈' : '👁️';
}

// 更新离线模式UI
function updateOfflineModeUI() {
  const isOffline = offlineModeSelect.value === 'true';
  const apiKeyGroup = apiKeyInput.closest('.setting-group');
  const apiKeyLabel = apiKeyGroup.querySelector('label');
  
  if (isOffline) {
    apiKeyLabel.textContent = 'API 密钥 (可选)';
    apiKeyInput.placeholder = '离线模式下可选';
  } else {
    apiKeyLabel.textContent = 'API 密钥';
    apiKeyInput.placeholder = '输入您的 Gemini API 密钥';
  }
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
  hideProgressSection();
  
  // 移除进度监听器
  window.electronAPI.removeProgressListeners();
  
  // 重新设置进度监听器
  setupProgressListeners();
  
  // 重置输入框
  const inputs = document.querySelectorAll('.rename-input');
  inputs.forEach(input => {
    input.value = '';
    input.style.color = '';
    input.classList.remove('success', 'error', 'same-name', 'skipped');
  });
} 