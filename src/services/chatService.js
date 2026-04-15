import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import knowledgeBase from '../data/knowledgeBase.json';

// Initialize Gemini AI
// Note: Replace with your actual API key or use environment variable
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Cache for available model (will be discovered on first use)
let cachedModelName = null;

/**
 * Get system prompt based on user role
 */
export const getSystemPrompt = (isAdmin, userProfile) => {
  if (isAdmin) {
    return `You are a helpful AI assistant for the iBayan Portal Admin panel. Your role is to guide administrators in managing the barangay portal system.

ADMIN FEATURES AVAILABLE:
- Dashboard: Overview with KPI metrics (total residents, pending verifications, active alerts)
- Manage Announcements: Create, edit, and delete barangay announcements
- Manage Emergency Alerts: Create urgent alerts with categories (Typhoon, Health, Flood, Utility) and severity levels (High, Medium, Low)
- Resident Verification: Review and approve/decline resident account registrations
- Manage Events & Programs: Create and manage barangay events, programs, and activities
- Admin Accounts: Add or remove admin accounts for system management

GUIDELINES:
- Be concise and action-oriented
- Provide clear, numbered steps when explaining processes
- Reference the knowledge base for accurate information
- Use professional but friendly tone
- Focus on practical, actionable advice
- If asked about resident features, explain how admins can manage them
- Do NOT mention features that don't exist (e.g., voting, surveys, feedback, document requests)

KNOWLEDGE BASE:
${JSON.stringify(knowledgeBase.admin_guides, null, 2)}

Always be helpful, accurate, and safe. Do not make up information. If you don't know something, say so.`;
  } else {
    return `You are a helpful AI assistant for the iBayan Portal. Your role is to assist residents in navigating and using the barangay portal system.

RESIDENT FEATURES AVAILABLE:
- Home (Dashboard): View recent announcements, alerts, and quick access to features
- Announcements: Read barangay announcements with details, dates, and images
- Emergency Alerts: View urgent safety, weather, and health notifications (requires verified account)
- Events & Programs: Browse upcoming barangay events, programs, and activities (requires verified account)
- Profile: View and update personal information, check verification status

ACCOUNT PROCESS:
- New users sign up, verify their email, then wait for admin verification
- Unverified accounts can only access Announcements and Profile
- Verified accounts get full access to all features

GUIDELINES:
- Be friendly, patient, and clear
- Use simple language that's easy to understand
- Provide step-by-step instructions when explaining features
- Reference the knowledge base for accurate information
- If you don't know something, direct users to contact the barangay hall
- Do NOT mention features that don't exist (e.g., voting, surveys, feedback, document requests, barangay clearance)

KNOWLEDGE BASE:
FAQ: ${JSON.stringify(knowledgeBase.faq, null, 2)}
Navigation: ${JSON.stringify(knowledgeBase.navigation, null, 2)}

Always be helpful, accurate, and safe. Do not make up information. If you don't know something, say so.`;
  }
};

/**
 * List available models using REST API and return the first working one
 */
const findAvailableModel = async () => {
  // If we already found a working model, use it
  if (cachedModelName) {
    return cachedModelName;
  }

  // First, try to list available models using REST API
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    if (response.ok) {
      const data = await response.json();
      const availableModels = data.models || [];
      
      // Filter models that support generateContent
      // Prefer stable models over preview/experimental ones (which may not be in free tier)
      const supportedModels = availableModels
        .filter(model => 
          model.supportedGenerationMethods && 
          model.supportedGenerationMethods.includes('generateContent') &&
          !model.name.includes('preview') &&
          !model.name.includes('exp') &&
          !model.name.includes('experimental')
        )
        .map(model => model.name.replace('models/', ''))
        .sort((a, b) => {
          // Prefer flash over pro (usually cheaper/faster)
          if (a.includes('flash') && !b.includes('flash')) return -1;
          if (!a.includes('flash') && b.includes('flash')) return 1;
          // Prefer 1.5 over 2.5 (more stable, better free tier support)
          if (a.includes('1.5') && b.includes('2.5')) return -1;
          if (!a.includes('1.5') && b.includes('1.5')) return 1;
          return 0;
        });
      
      console.log('Available models (filtered for free tier):', supportedModels);
      
      // Try the first available model (preferred for free tier)
      if (supportedModels.length > 0) {
        cachedModelName = supportedModels[0];
        console.log(`Using model: ${cachedModelName}`);
        return cachedModelName;
      }
      
      // If no stable models, try experimental ones as fallback
      const experimentalModels = availableModels
        .filter(model => 
          model.supportedGenerationMethods && 
          model.supportedGenerationMethods.includes('generateContent')
        )
        .map(model => model.name.replace('models/', ''));
      
      if (experimentalModels.length > 0) {
        console.warn('Only experimental models available. These may have quota restrictions.');
        cachedModelName = experimentalModels[0];
        console.log(`Using experimental model: ${cachedModelName}`);
        return cachedModelName;
      }
    }
  } catch (error) {
    console.log('Could not list models via REST API, trying fallback method:', error.message);
  }

  // Fallback: Try common model names (prioritize free tier models)
  const modelOptions = [
    'gemini-1.5-flash',  // Fast, efficient, good free tier support
    'gemini-1.5-pro',    // More capable, good free tier support
    'gemini-pro',        // Legacy but stable
    'gemini-1.0-pro',    // Older stable version
  ];

  // Test each model by trying to initialize it
  for (const modelName of modelOptions) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      // Try a simple test generation (very short to save tokens)
      const testResult = await model.generateContent('Hi');
      await testResult.response;
      
      // If we get here, the model works!
      cachedModelName = modelName;
      console.log(`Found working model: ${modelName}`);
      return modelName;
    } catch (error) {
      // Model doesn't work, try next one
      console.log(`Model ${modelName} not available`);
      continue;
    }
  }

  // If no model works, return null
  return null;
};

/**
 * Get relevant knowledge base context for a query
 */
const getKnowledgeContext = (query, isAdmin) => {
  const lowerQuery = query.toLowerCase();
  let context = '';

  if (isAdmin) {
    // Check admin guides
    Object.keys(knowledgeBase.admin_guides).forEach(key => {
      const guide = knowledgeBase.admin_guides[key];
      if (lowerQuery.includes(key.replace('_', ' ')) || 
          guide.title.toLowerCase().includes(lowerQuery) ||
          guide.steps.some(step => step.toLowerCase().includes(lowerQuery))) {
        context += `\n\n${guide.title}:\n${guide.steps.join('\n')}\nTips: ${guide.tips.join(', ')}`;
      }
    });
  } else {
    // Check FAQ
    knowledgeBase.faq.forEach(item => {
      if (lowerQuery.includes(item.question.toLowerCase()) || 
          item.answer.toLowerCase().includes(lowerQuery)) {
        context += `\n\nQ: ${item.question}\nA: ${item.answer}`;
      }
    });

    // Check navigation
    Object.keys(knowledgeBase.navigation).forEach(key => {
      if (lowerQuery.includes(key) || lowerQuery.includes('how to') || lowerQuery.includes('where')) {
        context += `\n\n${key}: ${knowledgeBase.navigation[key]}`;
      }
    });
  }

  return context;
};

/**
 * Send message to Gemini AI
 */
export const sendChatMessage = async (message, isAdmin, userProfile, conversationHistory = []) => {
  // Check if API key is configured
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    return {
      success: false,
      message: null,
      error: 'Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY environment variable.'
    };
  }

  // Find an available model
  const modelName = await findAvailableModel();
  
  if (!modelName) {
    return {
      success: false,
      message: null,
      error: 'No available Gemini models found. Please verify your API key is valid and has access to Gemini models. You can check available models at: https://ai.google.dev/models'
    };
  }

  // Get system prompt and knowledge context
  const systemPrompt = getSystemPrompt(isAdmin, userProfile);
  const knowledgeContext = getKnowledgeContext(message, isAdmin);
  
  // Build conversation history
  let conversationText = systemPrompt;
  
  if (knowledgeContext) {
    conversationText += `\n\nRELEVANT CONTEXT:\n${knowledgeContext}`;
  }
  
  // Add conversation history (last 5 messages for context)
  const recentHistory = conversationHistory.slice(-5);
  if (recentHistory.length > 0) {
    conversationText += '\n\nCONVERSATION HISTORY:\n';
    recentHistory.forEach(msg => {
      conversationText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
  }
  
  conversationText += `\n\nUser: ${message}\nAssistant:`;

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Generate content
    const result = await model.generateContent(conversationText);
    const response = await result.response;
    const text = response.text();
    
    return {
      success: true,
      message: text.trim(),
      error: null
    };
  } catch (error) {
    console.error('Chat service error:', error);
    
    let errorMessage = 'Failed to get response from AI assistant. ';
    
    // Handle quota/rate limit errors
    if (error.message && (error.message.includes('quota') || error.message.includes('429') || error.message.includes('rate limit'))) {
      // Extract retry delay if available
      let retryDelay = '';
      try {
        const errorData = JSON.parse(error.message.split(']')[1] || '{}');
        if (errorData[0] && errorData[0]['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
          const delay = errorData[0].retryDelay || '';
          retryDelay = delay ? ` Please retry in ${delay}.` : '';
        }
      } catch (e) {
        // Couldn't parse retry info
      }
      
      errorMessage = `Rate limit exceeded. You've reached your API quota limit. `;
      errorMessage += `This usually happens with free tier accounts or experimental models. `;
      errorMessage += `Please wait a moment and try again, or check your usage at https://ai.dev/usage?tab=rate-limit.${retryDelay}`;
      
      // Don't clear cached model for rate limits - it's still valid, just need to wait
    } else if (error.message && error.message.includes('API key')) {
      errorMessage += 'Invalid API key. Please check your REACT_APP_GEMINI_API_KEY in .env file.';
      cachedModelName = null; // Clear cache for auth errors
    } else if (error.message && (error.message.includes('not found') || error.message.includes('404'))) {
      errorMessage += 'Model not available. The system will try to find another model on the next attempt.';
      cachedModelName = null; // Clear cache to try different model
    } else {
      errorMessage += error.message || 'Unknown error occurred.';
      // Clear cache for unknown errors to force rediscovery
      cachedModelName = null;
    }
    
    return {
      success: false,
      message: null,
      error: errorMessage
    };
  }
};

/**
 * Save message to Firestore (optional)
 */
export const saveMessageToFirestore = async (userId, role, message, response, isAdmin) => {
  try {
    await addDoc(collection(db, 'chatMessages'), {
      userId,
      role: isAdmin ? 'admin' : 'resident',
      userMessage: message,
      assistantResponse: response,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving message to Firestore:', error);
    // Don't throw - message saving is optional
  }
};

