import React, { forwardRef, useState } from 'react'
import { Textarea } from './textarea'
import { sanitizeText, detectInappropriateContent } from '@/lib/security'
import { Alert, AlertDescription } from './alert'
import { AlertTriangle, Shield } from 'lucide-react'

interface SecureTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  sanitize?: boolean
  contentModeration?: boolean
  showValidation?: boolean
  maxLength?: number
}

export const SecureTextarea = forwardRef<HTMLTextAreaElement, SecureTextareaProps>(
  ({ 
    sanitize = true, 
    contentModeration = true, 
    showValidation = true, 
    maxLength = 1000,
    onChange, 
    ...props 
  }, ref) => {
    const [validationError, setValidationError] = useState<string>('')
    const [value, setValue] = useState(props.value || '')
    const [charCount, setCharCount] = useState(0)

    const validateContent = (inputValue: string): string => {
      if (!inputValue || !showValidation) return ''

      // Check length
      if (inputValue.length > maxLength) {
        return `Content exceeds maximum length of ${maxLength} characters`
      }

      // Check for inappropriate content
      if (contentModeration && detectInappropriateContent(inputValue)) {
        return 'Content may be inappropriate. Please review your message.'
      }

      // Check for potential XSS patterns
      if (inputValue.includes('<script') || inputValue.includes('javascript:')) {
        return 'Invalid characters detected'
      }

      return ''
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let inputValue = e.target.value
      
      // Enforce max length
      if (inputValue.length > maxLength) {
        inputValue = inputValue.substring(0, maxLength)
      }

      // Sanitize input if enabled
      if (sanitize) {
        inputValue = sanitizeText(inputValue)
      }

      // Validate content
      const error = validateContent(inputValue)
      setValidationError(error)
      setValue(inputValue)
      setCharCount(inputValue.length)

      // Call original onChange with sanitized value
      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: inputValue
          }
        }
        onChange(syntheticEvent)
      }
    }

    return (
      <div className="space-y-2">
        <div className="relative">
          <Textarea
            {...props}
            ref={ref}
            value={value}
            onChange={handleChange}
            className={validationError ? 'border-destructive' : props.className}
          />
          {sanitize && (
            <div className="absolute top-2 right-2" title="Content is automatically sanitized">
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{charCount}/{maxLength} characters</span>
          {sanitize && <span className="text-xs">Content automatically sanitized</span>}
        </div>

        {validationError && showValidation && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {validationError}
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }
)

SecureTextarea.displayName = 'SecureTextarea'