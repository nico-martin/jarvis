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
- `npm run test:calendar-filter` - Test Google Calendar creator filtering (Node.js 22.6+)

### Calendar creator filtering

Google Calendar event read tools are filtered in JARVIS before their results reach
the assistant or the manual tool result view. Only events whose `creator.email`
matches `mail@nico.dev` (case-insensitive) are returned. Change
`CALENDAR_CREATOR_EMAIL` in `src/ai/mcp/utils/calendarEventFilter.ts` to use a
different account.

The filter applies to servers named Google Calendar or hosted on a
`google-calendar` hostname. The MCP must return JSON event arrays, `events`/`items`/
`results` lists, or individual events with creator information. Events without
`creator.email` are omitted and counted as unverified; unsupported response formats
produce an explicit error instead of returning unfiltered data. Pagination tokens
are retained because later pages may still contain matching events. This is
client-side result filtering, not a change to Google permissions or the MCP server.

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
