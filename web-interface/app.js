// 全局变量
let selectedFiles = [];
let previewResults = [];

// DOM 元素
const uploadSection = document.getElementById('uploadSection');
const fileInput = document.getElementById('fileInput');
const apiKeyInput = document.getElementById('apiKey');
const modelNameSelect = document.getElementById('modelName');
const offlineModeSelect = document.getElementById('offlineMode');
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
  offlineModeSelect.value = config.offlineMode ? 'true' : 'false';
  
  // 绑定事件
  bindEvents();
});

// 绑定事件
function bindEvents() {
  // 文件选择
  uploadSection.addEventListener('click', () => fileInput.click());
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

// 渲染文件列表
function renderFileList() {
  fileList.innerHTML = '';
  
  selectedFiles.forEach((filePath, index) => {
    const fileName = filePath.split(/[/\\]/).pop();
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <div class="file-info">
        <div class="file-icon">🖼️</div>
        <div class="file-details">
          <h4>${fileName}</h4>
          <p>${filePath}</p>
        </div>
      </div>
      <div class="rename-section">
        <input type="text" class="rename-input" id="rename-${index}" placeholder="新文件名将在这里显示">
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
  if (!settings.apiKey && settings.offlineMode === 'false') {
    showStatus('请输入 API 密钥或选择离线模式', 'error');
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
      if (result.error) {
        input.value = `错误: ${result.error}`;
        input.style.color = '#dc3545';
      } else {
        input.value = result.suggestedName;
        input.style.color = '#28a745';
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
      if (result.success) {
        input.value = `✓ 重命名成功`;
        input.style.color = '#28a745';
      } else {
        input.value = `✗ 失败: ${result.error}`;
        input.style.color = '#dc3545';
      }
    }
  });
}

// 获取设置
function getSettings() {
  return {
    apiKey: apiKeyInput.value,
    modelName: modelNameSelect.value,
    offlineMode: offlineModeSelect.value
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