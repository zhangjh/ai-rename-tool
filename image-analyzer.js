const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { statSync, readFileSync } = require('fs');
const path = require('path');

class ImageAnalyzer {
  constructor(config = {}) {
    // Get config from parameters or environment variables with defaults
    const fullConfig = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      modelName: config.modelName,
      imageQuality: config.imageQuality || 90
    };
    
    this.supportedFormats = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'];
    
    this.apiKey = fullConfig.apiKey;
    this.baseUrl = fullConfig.baseUrl;
    this.modelName = fullConfig.modelName;
    this.imageQuality = fullConfig.imageQuality;
  }
  async analyzeImageWithLLM(imagePath, language = 'zh') {
    try {
      // Read image file directly and convert to base64
      const imageBuffer = readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Get file extension to determine MIME type
      const ext = path.extname(imagePath).toLowerCase();
      let mimeType = 'image/jpeg'; // default
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.png':
          mimeType = 'image/png';
          break;
        case '.bmp':
          mimeType = 'image/bmp';
          break;
        case '.tiff':
          mimeType = 'image/tiff';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
      }

      // Create analysis prompt based on language
      let prompt;
      if (language === 'en') {
        prompt = `Analyze this image and provide a short, descriptive filename in English using lowercase letters with underscores. Return only the filename, nothing else. For example: cat_on_windowsill_sunny_day`;
      } else {
        prompt = `分析这张图片并提供一个简短的、描述性的中文文件名，使用小写字母和下划线。只返回文件名，不要其他内容。例如：窗台上的猫_阳光明媚的一天`;
      }

      // Prepare the image data for Gemini API
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      };
      
      try {
        console.log('api key:', this.apiKey);
        console.log('model name:', this.modelName);
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({ 
            model: this.modelName,
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
            ]
        });
        
        const result = await model.generateContent([prompt, imagePart]);
        console.log('Raw API response:', result);
        
        const suggestedName = result.response.candidates[0].content.parts[0].text.trim();
        console.log('Raw API response:', suggestedName);
        
        // Clean and validate the suggested name
        const cleanName = this.cleanFilename(suggestedName, language);
        console.log('Cleaned name:', cleanName);
        
        // 获取当前日期作为前缀
        const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        
        if (cleanName) {
          return `${date}_${cleanName}`;
        } else {
          return this.generateFallbackName(imagePath);
        }
      } catch (error) {
        console.log('LLM analysis failed:', error.message);
        
        // Handle specific error types
        if (error.message.includes('quota')) {
          console.log('API quota exceeded. Please check your usage limits.');
        } else if (error.message.includes('model') || error.message.includes('404')) {
          console.log('Model not found or not available. Please check your model name.');
        } else if (error.message.includes('permission')) {
          console.log('Permission denied. Check your API key permissions.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          console.log('Network error. Please check your internet connection.');
        } else {
          console.log('API error:', error.message);
        }
        
        return this.generateFallbackName(imagePath);
      }
    } catch (error) {
      console.log('Image processing failed:', error.message);
      return this.generateFallbackName(imagePath);
    }
  }

  async getImageMetadata(imagePath) {
    try {
      const stats = statSync(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      let mimeType = 'image/jpeg';
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.png':
          mimeType = 'image/png';
          break;
        case '.bmp':
          mimeType = 'image/bmp';
          break;
        case '.tiff':
          mimeType = 'image/tiff';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
      }

      return {
        width: 0, // 无法确定
        height: 0, // 无法确定
        format: ext,
        mime: mimeType,
        size: stats.size,
        mtime: stats.mtime
      };
    } catch (error) {
      console.error('Failed to read image metadata:', error);
      return null;
    }
  }

  generateFallbackName(imagePath) {
    // 使用当前日期而不是文件修改时间，保持一致性
    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
    return `${date}_image_${timestamp}`;
  }

  cleanFilename(name, language = 'zh') {
    if (language === 'en') {
      // English filename cleaning
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 50);
    } else {
      // Chinese filename cleaning - allow Chinese characters
      return name
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s_-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 30); // Shorter for Chinese characters
    }
  }

  generateSuggestedName(text, metadata) {
    if (!text) {
      return this.generateFallbackName('dummy');
    }
    
    // 如果文本已经包含日期前缀，直接返回
    if (text.match(/^\d{4}-\d{2}-\d{2}_/)) {
      return text;
    }
    
    // 如果没有日期前缀，说明这是从AI分析来的原始文本，不需要再添加前缀
    // 因为在 analyzeImageWithLLM 中已经添加了日期前缀
    return text;
  }

  isImageFile(filename) {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return this.supportedFormats.includes(ext);
  }

  async extractTextFromImageWithFallback(imagePath, language = 'zh') {
    // 使用离线规则分析
    return await this.analyzeImageWithLLM(imagePath, language);
  }
}

module.exports = { ImageAnalyzer };
