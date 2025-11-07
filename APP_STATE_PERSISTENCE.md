# App State Persistence System

## Overview
This document explains the state persistence system that prevents the app from refreshing and redirecting to the dashboard when users minimize, switch apps, or return from background.

## Root Cause Fixed
The main issue was in `useAuth.tsx` where the `onAuthStateChange` listener would trigger redirects whenever auth events fired (including when app resumed from background). Fixed by only allowing redirects when users are actually on auth/landing pages, not when they're actively using main app pages.

## How It Works

### 1. Navigation State Persistence (`useAppState` hook)
- **Location**: `src/hooks/useAppState.tsx`
- **Purpose**: Saves and restores the user's current page/route
- **Storage**: Uses both `sessionStorage` and `localStorage` for redundancy

#### Key Features:
- Automatically saves current route whenever user navigates
- Detects when app goes to background (minimize, switch apps)
- Restores exact page user was on when app comes back to foreground
- Includes timestamp to expire old saved states (1 hour)
- Handles multiple app lifecycle events:
  - `visibilitychange` - App minimize/resume
  - `blur/focus` - Window switching
  - `freeze/resume` - Mobile-specific events

### 2. Scroll Position & Form Data Persistence (`useStatePersistence` hook)
- **Location**: `src/hooks/useStatePersistence.tsx`
- **Purpose**: Saves scroll position and form data on specific pages
- **Storage**: Uses `sessionStorage` with 30-minute expiration

#### Usage Example:
```tsx
import { useStatePersistence } from '@/hooks/useStatePersistence';

const MyComponent = () => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  // Save and restore scroll position and form data
  useStatePersistence('my-page', formData);
  
  return (
    // Your component JSX
  );
};
```

### 3. Fixed Navigation Links
Replaced all `<a href="...">` tags with React Router's `<Link to="...">` components to prevent full page reloads:
- `src/pages/NotFound.tsx` - Return to home link
- `src/components/TransferDialog.tsx` - Settings page link

## Technical Details

### Event Listeners
The system listens to these browser events:
1. **visibilitychange** - Fires when page becomes hidden/visible (minimize/resume)
2. **focus/blur** - Window focus changes (app switching)
3. **freeze/resume** - Mobile app lifecycle events
4. **beforeunload/pagehide** - Page navigation/closing

### Storage Strategy
- **sessionStorage**: Primary storage, cleared when browser closes
- **localStorage**: Backup storage, persists longer
- Both include timestamps to expire stale data

### State Expiration
- Route data: 1 hour
- Scroll/form data: 30 minutes

## Benefits
✅ Users return to exact page they left
✅ Scroll position preserved
✅ Form data not lost on minimize
✅ No unexpected redirects to dashboard
✅ Works across all devices (mobile, tablet, desktop)
✅ Automatic - no user action required

## Debugging
Console logs are added with `[AppState]` prefix to track:
- When app goes to background
- When app resumes from background
- Route restoration attempts
- Any errors during state restoration

Check browser console to see state persistence in action!
