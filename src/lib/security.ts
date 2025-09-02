// Security utilities for input validation and sanitization
import DOMPurify from 'dompurify'

// File type validation
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
]

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

// Input sanitization
export const sanitizeText = (input: string): string => {
  if (!input) return ''
  
  // Remove any HTML tags and potential XSS vectors
  const sanitized = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
  
  // Additional cleanup for common attack vectors
  return sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

// HTML content sanitization (for rich text)
export const sanitizeHTML = (input: string): string => {
  if (!input) return ''
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
    ALLOWED_ATTR: []
  })
}

// URL validation
export const isValidURL = (url: string): boolean => {
  try {
    const parsedURL = new URL(url)
    return ['http:', 'https:'].includes(parsedURL.protocol)
  } catch {
    return false
  }
}

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Phone number validation (Nigerian format)
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+234|0)[789][01]\d{8}$/
  return phoneRegex.test(phone.replace(/\s+/g, ''))
}

// File validation
export const validateFile = (file: File, allowedTypes: string[], maxSize: number) => {
  const errors: string[] = []
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`)
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`)
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.vbs$/i,
    /\.js$/i,
    /\.jar$/i
  ]
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    errors.push('File type appears to be executable and is not allowed')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Content moderation (basic)
export const detectInappropriateContent = (text: string): boolean => {
  const inappropriateWords = [
    // Add common inappropriate words/phrases
    'spam', 'scam', 'fake', 'fraud'
    // Note: In production, use a proper content moderation service
  ]
  
  const lowerText = text.toLowerCase()
  return inappropriateWords.some(word => lowerText.includes(word))
}

// Rate limiting helper
export const createRateLimitKey = (userId: string, action: string): string => {
  return `${userId}:${action}:${Math.floor(Date.now() / (60 * 1000))}`
}

// Password strength validation
export const validatePasswordStrength = (password: string) => {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  }
}

const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let score = 0
  
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
  
  if (score < 3) return 'weak'
  if (score < 5) return 'medium'
  return 'strong'
}