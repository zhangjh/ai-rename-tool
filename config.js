const aiConfig = {
  // API Configuration

  apiKey: "sk-proj-1234567890", // 配你自己的apiKey
  baseUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  modelName: 'glm-4v-flash',
  
  // Image processing settings
  convertToJPEG: false, // Preserve original image formats
  imageQuality: 90, // JPEG quality (0-100)
  
  // API-specific settings
  apiSettings: {
    // GLM specific settings
    supportsVision: true,
    requiresBase64: true,
    // Try different base64 formats if the first one fails
    tryAlternativeFormats: true,
    // GLM might need different image handling
    useRawImageData: false
  },
  
  // Tool Configuration
  supportedFormats: ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'],
  maxFilenameLength: 50,
  temperature: 0.3,
  maxTokens: 100,
  
  // Behavior Configuration
  enableLogging: process.env.ENABLE_LOGGING === 'true',
  skipCorruptedImages: true,
  fallbackToTimestamp: true,
  offlineMode: false, // 默认不开启离线模式
};

module.exports = aiConfig;
