import React, { forwardRef, useState } from 'react'
import { Input } from './input'
import { sanitizeText, isValidEmail, isValidPhoneNumber } from '@/lib/security'
import { Alert, AlertDescription } from './alert'
import { AlertTriangle } from 'lucide-react'

interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  validation?: 'email' | 'phone' | 'text' | 'none'
  sanitize?: boolean
  showValidation?: boolean
}

export const SecureInput = forwardRef<HTMLInputElement, SecureInputProps>(
  ({ validation = 'text', sanitize = true, showValidation = true, onChange, ...props }, ref) => {
    const [validationError, setValidationError] = useState<string>('')
    const [value, setValue] = useState(props.value || '')

    const validateInput = (inputValue: string): string => {
      if (!inputValue || !showValidation) return ''

      switch (validation) {
        case 'email':
          return isValidEmail(inputValue) ? '' : 'Please enter a valid email address'
        case 'phone':
          return isValidPhoneNumber(inputValue) ? '' : 'Please enter a valid Nigerian phone number'
        case 'text':
          // Check for potential XSS patterns
          if (inputValue.includes('<script') || inputValue.includes('javascript:')) {
            return 'Invalid characters detected'
          }
          return ''
        default:
          return ''
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value
      
      // Sanitize input if enabled
      if (sanitize && validation !== 'none') {
        inputValue = sanitizeText(inputValue)
      }

      // Validate input
      const error = validateInput(inputValue)
      setValidationError(error)
      setValue(inputValue)

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
        <Input
          {...props}
          ref={ref}
          value={value}
          onChange={handleChange}
          className={validationError ? 'border-destructive' : props.className}
        />
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

SecureInput.displayName = 'SecureInput'