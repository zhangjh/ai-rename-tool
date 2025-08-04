export const aiConfig = {
  // API Configuration

  apiKey: "sk-proj-1234567890",
  baseUrl: "https://api.openai.com/v1",
  modelName: 'gpt-4o-mini',
  
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
  
  // Custom prompts for different types of images (optional)
  customPrompts: {
    document: `You are analyzing a document image. Extract key information like:
    - Document type (invoice, receipt, contract, etc.)
    - Important dates or numbers
    - Key identifiers
    Return a descriptive filename with relevant keywords.`,
    
    photo: `You are analyzing a photo. Describe the main subject and scene:
    - Main subject (person, animal, object)
    - Scene or location
    - Notable features or actions
    Return a descriptive filename that captures the essence of the photo.`,
    
    text: `You are analyzing an image with text. Extract the main text content:
    - Headings or titles
    - Key phrases that summarize the content
    - Important numbers or codes
    Return a filename based on the main text content.`
  }
};

export default aiConfig;
