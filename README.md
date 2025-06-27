# ElectronX

A secure, cross-platform desktop wrapper for X.com built with Electron, TypeScript, and React. ElectronX provides a native desktop experience for X.com with native security, performance optimizations, and rich customization options.

## 🚀 Features

### Security & Privacy
- **🔒 Security-First Architecture**: Sandboxed renderer processes with context isolation
- **🛡️ Content Security Policy**: Strict CSP with domain whitelisting and request filtering
- **🔐 Encrypted Storage**: Secure, machine-specific encryption for settings and data
- **✅ Permission Management**: Granular control over system permissions with user consent

### User Experience
- **🎨 Native Desktop UI**: Custom title bar, navigation panel, and status bar
- **🌓 Intelligent Theming**: Light, dark, and system theme modes with seamless switching
- **⌨️ Full Keyboard Navigation**: Comprehensive shortcuts for X.com sections and app controls
- **🖱️ Enhanced Navigation**: Quick access panel with customizable navigation links
- **🎯 Optimized Interface**: iPad Pro user agent for best desktop X.com experience

### Performance & Reliability
- **⚡ Optimized Performance**: BrowserView integration with lazy loading and memory management
- **🔄 Auto-Updates**: Secure, cryptographically signed automatic updates
- **📱 System Integration**: Native notifications, global shortcuts, and system tray
- **🖥️ Cross-Platform**: Native behavior on Windows, macOS, and Linux
- **💾 State Persistence**: Intelligent window state and settings management

### Developer Experience
- **🏗️ Modern Architecture**: Multi-process Electron with TypeScript and React
- **🧪 Comprehensive Testing**: Unit, integration, and E2E tests with extensive mocking
- **🔧 Advanced Build System**: Webpack-based multi-process builds with hot reload
- **📊 Development Tools**: ESLint, Prettier, and comprehensive debugging support

## 📋 Prerequisites

- **Node.js** 18.0 or later
- **npm** 9.0 or later
- **Git** for cloning the repository

### Platform-Specific Requirements
- **Windows**: Visual Studio Build Tools 2019+
- **macOS**: Xcode Command Line Tools
- **Linux**: build-essential, gtk3-dev, libnss3-dev

## 🛠️ Installation & Setup

### Quick Start

```bash
# Clone the repository
git clone https://github.com/imagedthat/electronx.git
cd electronx

# Install dependencies
npm install

# Build the application
npm run build

# Start the application
npm start
```

### Development Setup

```bash
# Start development mode with hot reload
npm run dev

# In a separate terminal, run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🏗️ Architecture Overview

ElectronX implements a **security-first, multi-process architecture**:

### Process Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Main Process                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐  │
│  │ ElectronXApp    │ │ WindowManager   │ │ SecurityManager│  │
│  │ (Orchestrator)  │ │ (UI & Content)  │ │ (Permissions) │  │
│  └─────────────────┘ └─────────────────┘ └───────────────┘  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐  │
│  │ Service Layer   │ │ Storage Manager │ │ IPC Handlers  │  │
│  │ (Background)    │ │ (Encrypted)     │ │ (Secure)      │  │
│  └─────────────────┘ └─────────────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│      Renderer Process       │    │       BrowserView           │
│  ┌─────────────────────────┐ │    │  ┌─────────────────────────┐ │
│  │    React UI Layer       │ │    │  │     X.com Content       │ │
│  │  - TitleBar             │ │    │  │   (Sandboxed)           │ │
│  │  - SidePanel            │ │    │  │   - iPad Pro UA         │ │
│  │  - StatusBar            │ │    │  │   - Custom CSS          │ │
│  │  - SettingsModal        │ │    │  │   - Request Filtering   │ │
│  └─────────────────────────┘ │    │  └─────────────────────────┘ │
│  ┌─────────────────────────┐ │    └─────────────────────────────┘
│  │    Preload Bridge       │ │
│  │  (Secure IPC Context)   │ │
│  └─────────────────────────┘ │
└─────────────────────────────┘
```

### Key Components

#### Main Process (`src/main/`)
- **ElectronXApp**: Central orchestrator managing all services and lifecycle
- **WindowManager**: BrowserView integration with X.com content management
- **SecurityManager**: CSP enforcement, permission management, URL validation
- **Service Layer**: Auto-updater, notifications, encrypted storage, system integration

#### Renderer Process (`src/renderer/`)
- **React Application**: Modern UI with TypeScript and custom hooks
- **Preload Bridge**: Secure IPC communication with comprehensive API exposure
- **Custom Components**: TitleBar, SidePanel, StatusBar, SettingsModal
- **Theme System**: Dynamic light/dark mode with system preference detection

#### Shared Layer (`src/shared/`)
- **Type Definitions**: Comprehensive TypeScript interfaces for IPC and application state
- **Constants & Utilities**: Cross-platform helpers and configuration
- **Validation**: Input sanitization and security utilities

## 🔒 Security Model

### Multi-Layered Security

1. **Process Isolation**
   - Main process handles system interactions
   - Renderer processes run without Node.js access
   - BrowserView isolates X.com content with separate session

2. **IPC Security**
   - Type-safe communication channels
   - Request/response pattern with timeout handling
   - Input validation and sanitization
   - Channel whitelisting and validation

3. **Content Security Policy**
   - Strict CSP with domain whitelisting
   - Runtime CSP updates for dynamic content
   - Script and style source restrictions

4. **Network Security**
   - Request filtering and domain validation
   - Ad and tracker blocking
   - Certificate validation
   - Secure update mechanisms

## 🧪 Testing Strategy

### Comprehensive Testing Suite

```bash
# Unit & Integration Tests (Jest)
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report

# End-to-End Tests (Playwright)
npm run test:e2e           # Full E2E suite
npm run test:e2e:headed    # Visual debugging
```

### Test Architecture
- **Unit Tests**: Service layer testing with comprehensive mocking
- **Integration Tests**: IPC communication and component integration
- **E2E Tests**: Full application workflow testing across platforms
- **Mocking Strategy**: Complete Electron API mocking for isolated testing

## 📦 Build System

### Multi-Process Webpack Configuration

```bash
# Development Commands
npm run dev                # Concurrent build + hot reload
npm run build:watch        # Watch mode for all processes

# Production Build
npm run build              # Build all processes
npm run build:main         # Main process only
npm run build:renderer     # Renderer process only
npm run build:preload      # Preload script only

# Quality Assurance
npm run type-check         # TypeScript validation
npm run lint               # ESLint with auto-fix
npm run clean              # Clean build artifacts
```

### Distribution & Packaging

```bash
# Package for Development
npm run pack               # Package for current platform

# Cross-Platform Distribution
npm run dist:all           # Build for all platforms
npm run dist:mac           # macOS (DMG + ZIP, x64 + ARM64)
npm run dist:win           # Windows (NSIS + Portable)
npm run dist:linux         # Linux (AppImage + DEB + RPM)
```

### Platform-Specific Features

#### macOS
- **Native Integration**: Traffic light buttons, dock badges, menu bar
- **Universal Binaries**: Intel + Apple Silicon support
- **Notarization Ready**: Code signing and security compliance
- **Dark Mode**: Full native dark mode support

#### Windows
- **NSIS Installer**: Customizable installation with shortcuts
- **Portable Version**: No-install executable option
- **Auto-Updater**: Background updates with user notification
- **Taskbar Integration**: Progress indicators and jump lists

#### Linux
- **Multiple Formats**: AppImage, DEB, RPM packages
- **Desktop Integration**: .desktop files and system notifications
- **Protocol Handlers**: x:// and twitter:// scheme support
- **Dependency Management**: Proper system library dependencies

## ⚙️ Configuration & Customization

### Application Settings

Access via `Ctrl/Cmd + ,` or settings button:

#### General Settings
- **Startup Behavior**: Launch on system startup, minimize to tray
- **Notifications**: System notifications for mentions and messages
- **Zoom Level**: Global zoom control (50% - 200%)
- **Update Management**: Auto-update preferences

#### Appearance Customization
- **Theme Selection**: Light, Dark, or System preference
- **Custom CSS**: Advanced styling with syntax highlighting
- **Window Behavior**: Always on top, hide menu bar
- **UI Components**: Toggle side panel, status bar visibility

#### Advanced Features
- **Content Filtering**: Keyword blocking and content moderation
- **Developer Tools**: Enable/disable debugging tools
- **Data Management**: Cache clearing, settings export/import
- **Performance**: Memory usage optimization, hardware acceleration

### Keyboard Shortcuts

#### Navigation Shortcuts
```
Ctrl/Cmd + 1-7    Navigate to X.com sections (Home, Explore, etc.)
Ctrl/Cmd + R      Reload current page
Ctrl/Cmd + ←/→    Browser back/forward navigation
Ctrl/Cmd + L      Focus address/search bar
```

#### View Controls
```
Ctrl/Cmd + +/-    Zoom in/out
Ctrl/Cmd + 0      Reset zoom to 100%
F11 (Ctrl+Cmd+F)  Toggle fullscreen mode
Ctrl/Cmd + Shift + S  Toggle side panel
```

#### Application Controls
```
Ctrl/Cmd + ,      Open settings/preferences
Ctrl/Cmd + N      Compose new tweet
Ctrl/Cmd + F      Find in page
F12 (Cmd+Alt+I)   Toggle developer tools
Ctrl/Cmd + Q      Quit application
```

### Custom CSS Examples

```css
/* Hide promoted content */
[data-testid="placementTracking"],
[data-testid="trend"] article[data-testid="trendItem"] {
    display: none !important;
}

/* Custom scrollbar styling */
::-webkit-scrollbar {
    width: 8px;
    background: var(--color-neutral-50);
}

::-webkit-scrollbar-thumb {
    background: var(--color-neutral-300);
    border-radius: 4px;
}

/* Enhance readability */
article[data-testid="tweet"] {
    border-radius: 12px !important;
    margin-bottom: 8px !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
}
```

## 🚀 Performance Optimization

### Runtime Performance
- **Memory Management**: Efficient process communication and cleanup
- **Lazy Loading**: On-demand component and resource loading
- **Caching Strategy**: Intelligent caching with automatic invalidation
- **Background Processing**: Non-blocking operations with worker threads

### Build Performance
- **Incremental Builds**: Fast rebuilds with change detection
- **Code Splitting**: Vendor chunks and dynamic imports
- **Asset Optimization**: Image compression and bundle analysis
- **Parallel Processing**: Concurrent build steps where possible

## 🛠️ Development Guidelines

### Code Quality Standards
- **TypeScript**: Strict mode with comprehensive type coverage
- **ESLint**: Enforced code style with automatic fixing
- **Testing**: Minimum 80% code coverage requirement
- **Documentation**: JSDoc comments for public APIs

### Contribution Workflow

1. **Fork & Clone**: Create your own fork of the repository
2. **Branch**: Create feature branches from `main`
3. **Develop**: Follow TypeScript and React best practices
4. **Test**: Add tests for new functionality
5. **Validate**: Run linting, type checking, and all tests
6. **Commit**: Use conventional commit messages
7. **Pull Request**: Submit with detailed description

### Adding New Features

#### IPC Channels
1. Define types in `src/shared/types/ipc.ts`
2. Add handler in `src/main/ipc/handlers.ts`
3. Expose via preload in `src/renderer/preload/index.ts`
4. Create React hook in `src/renderer/hooks/`
5. Add comprehensive tests

#### UI Components
1. Create component in `src/renderer/ui/components/`
2. Follow existing naming conventions
3. Include TypeScript interfaces
4. Add accessibility attributes
5. Support both light and dark themes

## 🐛 Troubleshooting

### Common Development Issues

#### Build Problems
```bash
# Clear cache and rebuild
npm run clean
rm -rf node_modules
npm install
npm run build

# Check Node.js version
node --version  # Should be 18+
npm --version   # Should be 9+
```

#### Testing Issues
```bash
# Reset test environment
npm run clean
npm test -- --clearCache
npm test

# Debug specific test
npm test -- --testNamePattern="WindowManager"
```

#### Runtime Errors
```bash
# Enable debug logging
DEBUG=electronx:* npm start

# Check main process logs
# Linux/macOS: ~/.config/ElectronX/logs/
# Windows: %APPDATA%/ElectronX/logs/
```

### Platform-Specific Issues

#### macOS
- **Gatekeeper**: Run `xattr -rd com.apple.quarantine ElectronX.app`
- **Permissions**: Check System Preferences > Security & Privacy
- **Notarization**: Ensure valid developer certificate

#### Windows
- **Antivirus**: Add ElectronX to antivirus exclusions
- **SmartScreen**: Allow app through Windows SmartScreen
- **Updates**: Run as administrator if update fails

#### Linux
- **Dependencies**: Install required system libraries
- **AppImage**: Make executable: `chmod +x ElectronX.AppImage`
- **Desktop Integration**: Use `--install` flag for desktop entries

## 📚 API Documentation

### IPC Channel Reference

#### Application Channels
- `app:version` - Get application version
- `app:quit` - Quit application
- `app:restart` - Restart application
- `app:focus` - Bring app to foreground

#### Window Management
- `window:minimize` - Minimize window
- `window:maximize` - Maximize/restore window
- `window:fullscreen` - Toggle fullscreen
- `window:center` - Center window on screen

#### Settings Management
- `settings:get` - Retrieve settings
- `settings:set` - Update settings
- `settings:reset` - Reset to defaults
- `settings:export` - Export settings to file

#### Theme System
- `theme:get` - Get current theme
- `theme:set` - Change theme
- `theme:system` - Use system theme

## 🎯 Roadmap

### Planned Features
- **Multiple Accounts**: Support for multiple X.com accounts
- **Advanced Filtering**: Machine learning content filtering
- **Plugin System**: Third-party plugin architecture
- **Enhanced Analytics**: Personal usage analytics
- **Cloud Sync**: Settings synchronization across devices

### Performance Improvements
- **WebView2 Integration**: Modern web engine on Windows
- **Memory Optimization**: Reduced memory footprint
- **Startup Performance**: Faster cold start times
- **Network Optimization**: Improved caching strategies

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

### Third-Party Licenses
- Electron: MIT License
- React: MIT License
- TypeScript: Apache License 2.0
- All other dependencies: See individual package licenses

## 🙏 Acknowledgments

### Core Technologies
- **[Electron](https://electronjs.org/)** - Cross-platform desktop app framework
- **[React](https://reactjs.org/)** - UI library with hooks and modern patterns
- **[TypeScript](https://typescriptlang.org/)** - Type-safe JavaScript development
- **[Webpack](https://webpack.js.org/)** - Module bundling and build optimization

### Development Tools
- **[electron-builder](https://electron.build/)** - Application packaging and distribution
- **[Jest](https://jestjs.io/)** - JavaScript testing framework
- **[Playwright](https://playwright.dev/)** - End-to-end testing
- **[ESLint](https://eslint.org/)** - Code quality and style enforcement

## 🆘 Support & Community

### Getting Help
- **🐛 [Bug Reports](https://github.com/imagedthat/electronx/issues)** - Report bugs and issues
- **💡 [Feature Requests](https://github.com/imagedthat/electronx/discussions)** - Suggest new features
- **📖 [Documentation](https://github.com/imagedthat/electronx/wiki)** - Comprehensive guides
- **💬 [Community Chat](https://discord.gg/electronx)** - Real-time community support

### Security Issues
For security vulnerabilities, please email **security@electronx.com** instead of creating public issues.

## ⚖️ Disclaimer

**ElectronX** is an unofficial desktop client for X.com (formerly Twitter). This application is not affiliated with, endorsed by, or sponsored by X Corp, Twitter

- **Trademark Notice**: All trademarks, service marks, and logos are the property of their respective owners
- **Terms of Service**: Use of this application is subject to X.com's Terms of Service
- **Privacy Policy**: ElectronX respects user privacy and does not collect personal data
- **Legal Compliance**: Users are responsible for compliance with applicable laws and regulations

**Use at your own discretion and in accordance with X.com's Terms of Service.**