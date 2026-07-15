# Resume Builder

A modern, full-stack resume builder application that allows users to create, edit, and export professional resumes with multiple template options. Upload existing resumes for automatic text extraction or build from scratch with an intuitive editor.

## ✨ Features

- **Resume Upload & Parsing** - Upload PDF or Word documents with automatic text extraction and intelligent field parsing
- **Live Preview** - Real-time resume preview as you edit, rendered at actual document size
- **Multiple Templates** - Four professionally designed templates: Modern, Classic, Minimal, and Creative
- **Comprehensive Editor** - Tabbed interface for Personal Info, Experience, Education, Skills, and Projects
- **PDF Export** - Client-side PDF generation with multi-page support
- **Resume Management** - Save, load, and manage multiple resumes with database persistence
- **Dark/Light Mode** - System-aware theme toggle with smooth transitions
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Auto-seeding** - Sample resumes automatically loaded for new databases

## 🛠 Tech Stack

### Frontend

| Technology     | Version | Purpose                 |
| -------------- | ------- | ----------------------- |
| React          | 18.3.1  | UI framework            |
| TypeScript     | 5.6.3   | Type safety             |
| TailwindCSS    | 3.4.17  | Styling                 |
| Radix UI       | Latest  | Accessible components   |
| TanStack Query | 5.60.5  | Server state management |
| Wouter         | 3.3.5   | Client-side routing     |
| Framer Motion  | 11.13.1 | Animations              |
| Lucide React   | 0.453.0 | Icons                   |

### Backend

| Technology  | Version | Purpose      |
| ----------- | ------- | ------------ |
| Express     | 5.0.1   | HTTP server  |
| Node.js     | 20.x    | Runtime      |
| PostgreSQL  | -       | Database     |
| Drizzle ORM | 0.39.3  | Database ORM |

### Document Processing

| Technology | Purpose                        |
| ---------- | ------------------------------ |
| pdf.js     | PDF text extraction            |
| Mammoth    | DOCX text extraction           |
| PDFKit     | Selectable-text PDF generation |

### Development

| Technology  | Version | Purpose                 |
| ----------- | ------- | ----------------------- |
| Vite        | 7.3.0   | Build tool & dev server |
| tsx         | 4.20.5  | TypeScript execution    |
| Drizzle Kit | 0.31.8  | Database migrations     |
| Vitest      | 4.x     | Unit testing            |
| Playwright  | -       | End-to-end testing      |

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **PostgreSQL** database (local or hosted)
- **npm** or compatible package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd resume-builder
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/resume_builder
   # Generate with: openssl rand -base64 32
   SESSION_SECRET=
   PORT=5000
   ```

4. **Set up the database**

   ```bash
   npm run db:push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open the application**

   Navigate to `http://localhost:5000` in your browser.

## 📖 Usage

### Creating a Resume

1. **Upload an existing resume** - Drag and drop or click to upload a PDF/DOCX file. The system will extract text and auto-populate fields.
2. **Or start fresh** - Click "Create Resume Manually" to begin with a blank template.

### Editing

Use the tabbed editor to update:

- **Personal** - Name, title, summary, contact information
- **Experience** - Work history with company, role, dates, and highlights
- **Education** - Academic background with institution, degree, and GPA
- **Skills** - Technical and soft skills with proficiency levels
- **Projects** - Portfolio projects with descriptions and links

### Choosing a Template

Navigate to the **Template** tab to select from:

- **Modern** - Clean design with blue accents
- **Classic** - Traditional serif layout
- **Minimal** - Ultra-clean with generous whitespace
- **Creative** - Two-column layout with dark sidebar

### Exporting

Click **Export PDF** to download a compact, print-ready PDF generated from the
current editor content. Exported text remains selectable, and long resumes are
paginated between entries to prevent clipped headings and split job records.

## 📁 Project Structure

```
resume-builder/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── resume-editor/     # Editor form components
│   │   │   ├── resume-templates/  # Template renderers
│   │   │   └── ui/                # Reusable UI components (shadcn/ui)
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # Utilities (query client)
│   │   ├── pages/                 # Page components
│   │   ├── App.tsx                # Root component
│   │   └── index.css              # Global styles
│   └── index.html                 # HTML entry point
├── server/                 # Backend Express application
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database operations
│   ├── github.ts           # GitHub integration utilities
│   ├── static.ts           # Static file serving
│   └── vite.ts             # Vite dev server integration
├── shared/                 # Shared code between client/server
│   └── schema.ts           # Zod schemas & Drizzle tables
├── tests/                  # Test suites
│   ├── unit/
│   │   ├── server/         # Backend unit tests
│   │   └── client/         # Frontend unit tests
│   └── e2e/                # End-to-end Playwright tests
│       ├── api.spec.ts
│       ├── home.spec.ts
│       └── ...
├── drizzle.config.ts       # Drizzle ORM configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## 🔌 API Documentation

### Resumes

| Method   | Endpoint           | Description       |
| -------- | ------------------ | ----------------- |
| `GET`    | `/api/resumes`     | List all resumes  |
| `GET`    | `/api/resumes/:id` | Get single resume |
| `POST`   | `/api/resumes`     | Create new resume |
| `POST`   | `/api/resumes/pdf` | Export current editor content as PDF |
| `PUT`    | `/api/resumes/:id` | Update resume     |
| `DELETE` | `/api/resumes/:id` | Delete resume     |

### File Upload

| Method | Endpoint      | Description                            |
| ------ | ------------- | -------------------------------------- |
| `POST` | `/api/upload` | Upload resume file for text extraction |

#### Request

- **Content-Type**: `multipart/form-data`
- **Field**: `file` (PDF, DOC, or DOCX, max 10MB)

#### Response

```json
{
  "filename": "resume.pdf",
  "extractedText": "Full extracted text...",
  "parsedContent": {
    "fullName": "John Doe",
    "title": "Software Engineer",
    "contact": { ... },
    "skills": [ ... ]
  }
}
```

### Resume Schema

```typescript
{
  id: string;
  title: string;
  template: "modern" | "classic" | "minimal" | "creative";
  content: {
    fullName: string;
    title?: string;
    summary?: string;
    contact?: {
      email?: string;
      phone?: string;
      location?: string;
      linkedin?: string;
      website?: string;
    };
    experience?: WorkExperience[];
    education?: Education[];
    skills?: Skill[];
    projects?: Project[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## 💻 Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Type check without emitting
npm run check

# Build for production
npm run build

# Start production server
npm run start

# Push schema changes to database
npm run db:push

# Run unit tests (regression tests)
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run e2e tests
npm test

# Run e2e tests with UI
npm run test:ui
```

### Code Style

- TypeScript strict mode enabled
- React functional components with hooks
- Tailwind CSS for styling
- Zod for runtime validation
- Path aliases: `@/` → `client/src/`, `@shared/` → `shared/`

## 🚢 Deployment

### Environment Variables

| Variable         | Required | Description                                                  |
| ---------------- | -------- | ------------------------------------------------------------ |
| `DATABASE_URL`   | Yes      | PostgreSQL connection string                                 |
| `SESSION_SECRET` | Yes      | Random secret of at least 32 characters for signing sessions |
| `PORT`           | No       | Server port (default: 5000)                                  |
| `NODE_ENV`       | No       | `development` or `production`                                |

### Build & Run

```bash
# Build the application
npm run build

# Start production server
npm run start
```

The build process:

1. Compiles TypeScript server code to `dist/index.cjs`
2. Bundles React client to `dist/public/`
3. Production server serves static files from `dist/public/`

### Platform Notes

- Originally developed on Replit with Replit-specific Vite plugins (optional)
- Compatible with any Node.js hosting platform (Railway, Render, Fly.io, etc.)
- Requires PostgreSQL database (Neon, Supabase, Railway Postgres, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code patterns and naming conventions
- Add TypeScript types for new code
- Test resume upload/export functionality after changes
- Ensure responsive design works on mobile

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ using React, Express, and PostgreSQL
