# JARVIS

A modern AI assistant web application featuring voice interaction, real-time conversation, and MCP (Model Context Protocol) server integration.

## Features

- **Voice Interaction**: Voice activity detection, speech-to-text, and text-to-speech capabilities
- **Real-time Chat**: Interactive conversation interface with AI assistant
- **MCP Server Integration**: Connect and interact with Model Context Protocol servers
- **Image-to-Text**: Convert images to text descriptions
- **Multi-modal Interface**: Switch between voice-activated JARVIS mode and traditional chat
- **Browser-based AI**: Runs locally in your browser using WebGPU and language model APIs

## Tech Stack

- **Framework**: Preact with TypeScript
- **Styling**: Tailwind CSS
- **AI/ML**: Transformers.js
- **Build Tool**: Vite
- **MCP**: Model Context Protocol SDK for server integrations

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- Modern browser with WebGPU support

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd jarvis
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run preview` - Preview production build

## Usage

### JARVIS Mode
- Click to activate voice interaction
- Speak naturally to interact with the AI assistant
- Visual rings indicate voice activity and responses

### Chat Mode
- Switch to traditional text-based chat interface
- Type messages and receive AI responses

### MCP Settings
- Navigate to `/mcp` to configure Model Context Protocol servers
- Add HTTP servers for extended functionality
- Manage server connections and available tools

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Nicolas Martin (mail@nico.dev)