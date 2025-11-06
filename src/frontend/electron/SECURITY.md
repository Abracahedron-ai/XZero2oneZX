# Electron Security Configuration

## Security Settings

### Enabled Security Features

- **webSecurity: true** - Enables web security (CORS, CSP, etc.)
- **contextIsolation: true** - Isolates preload script from renderer
- **nodeIntegration: false** - Prevents Node.js access from renderer
- **allowRunningInsecureContent: false** - Blocks insecure content

### Content Security Policy (CSP)

CSP is configured in `renderer/pages/_document.tsx` to allow:
- Localhost connections (development)
- WebSocket connections (ws://localhost:*)
- Inline scripts (required for Next.js)
- Blob URLs (for media handling)

### Development vs Production

**Development:**
- CSP allows localhost connections
- DevTools enabled for debugging
- More permissive CSP for development needs

**Production:**
- Stricter CSP
- DevTools disabled
- Only file:// protocol allowed

## Security Best Practices

1. **Context Isolation**: Always enabled - isolates preload from renderer
2. **Node Integration**: Disabled - prevents Node.js access from web content
3. **Preload Script**: Used for safe IPC communication
4. **CSP**: Configured to allow only necessary resources
5. **Localhost Access**: Only allowed in development mode

## WebRTC/Camera Access

WebRTC and camera access work with `webSecurity: true` because:
- They use standard browser APIs
- Localhost connections are allowed via CSP
- No special security bypass needed

## Notes

- The security warnings in console are expected in development
- They will be suppressed in packaged builds
- All security features are enabled for production safety

