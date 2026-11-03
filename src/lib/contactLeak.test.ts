import { describe, it, expect } from 'vitest'
import { detectContactLeak } from './contactLeak'

describe('detectContactLeak', () => {
  it('flags Nigerian phone numbers', () => expect(detectContactLeak('call 08031234567')).toBe('phone number'))
  it('flags wallet addresses', () => expect(detectContactLeak('send to 0x' + 'a'.repeat(40))).toBe('crypto wallet'))
  it('flags WhatsApp mentions', () => expect(detectContactLeak('add me on whatsapp')).toBe('outside payment app'))
  it('allows normal messages', () => expect(detectContactLeak('I can deliver the logo in 3 days')).toBeNull())
})
