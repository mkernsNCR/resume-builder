# Resume Builder Application

## Overview

A full-stack Resume Builder web application that allows users to upload resumes (PDF/DOCX), extract text content, manually structure resume data through forms, apply professional templates, and export polished resumes as PDF. The application features a split-screen interface with form editing on the left and live template preview on the right.

### Mobile Experience
- Preview tab (visible only on mobile via lg:hidden) provides live resume preview
- Real-time preview updates using useWatch with 150ms debounce for smooth form-to-preview sync

### Document Dimensions
- Templates use US Letter size: 816px × 1056px (8.5" × 11" at 96dpi)
- Aspect ratio: 8.5 / 11 (1:1.294)
- Desktop preview scaled to 65%, mobile to 45%
- All templates have white background with overflow-hidden for paper-like appearance

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (@tanstack/react-query) for server state, local React state for UI
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation via @hookform/resolvers
- **PDF Generation**: html2canvas + jsPDF for client-side PDF export

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **File Uploads**: Multer middleware handling PDF and DOCX files (stored in ./uploads directory)
- **Text Extraction**: pdfjs-dist for PDFs (server-side with disabled workers), mammoth for DOCX documents
- **API Pattern**: RESTful endpoints under /api prefix

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: shared/schema.ts (shared between frontend and backend)
- **Migrations**: Drizzle Kit with migrations output to ./migrations directory
- **Schema Design**: Resumes table with JSONB content field for flexible structured data storage

### Project Structure
```
├── client/src/           # React frontend application
│   ├── components/       # UI components (resume-editor, resume-templates, ui/)
│   ├── pages/           # Page components (home, not-found)
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities and query client
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Database access layer
│   └── vite.ts          # Vite dev server integration
├── shared/              # Shared code between frontend/backend
│   └── schema.ts        # Drizzle schema and Zod validation
└── uploads/             # File upload storage directory
```

### Resume Templates
Four professional resume templates implemented as React components:
- Modern: Clean design with blue accents
- Classic: Traditional serif layout with centered header
- Minimal: Ultra-clean design with generous whitespace
- Creative: Two-column layout with dark sidebar

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production Build**: Custom build script using esbuild for server bundling and Vite for client
- **Output**: dist/public for client assets, dist/index.cjs for server bundle

## External Dependencies

### Database
- **PostgreSQL**: Primary database via DATABASE_URL environment variable
- **Connection**: pg (node-postgres) connection pool
- **Session Storage**: connect-pg-simple for Express sessions

### File Processing
- **pdfjs-dist**: PDF text extraction (server-side with GlobalWorkerOptions.workerSrc = "")
- **mammoth**: DOCX to text conversion
- **multer**: Multipart form handling for file uploads

### PDF Export
- **html2canvas**: Captures resume preview as image
- **jsPDF**: Generates PDF documents from captured content

### UI Framework
- **Radix UI**: Accessible primitive components (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-built component patterns using Radix primitives
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Frontend build tool and dev server
- **Drizzle Kit**: Database migration and schema management
- **TypeScript**: Type checking across entire codebase