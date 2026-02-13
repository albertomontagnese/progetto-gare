# Progetto Gare

AI-powered platform for managing Italian public procurement tenders (gare d'appalto). Upload tender documents, get AI-driven requirement extraction, compliance checklists, and draft proposals.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16** (App Router, TypeScript) |
| UI | **Tailwind CSS 4**, **shadcn/ui**, **Framer Motion** |
| Database | **Firestore** (Firebase Admin SDK) |
| File Storage | **Google Cloud Storage** |
| AI | **OpenAI** (gpt-4.1-mini) |
| Auth | Custom JWT (magic link via email) |
| Email | **Resend** |
| Hosting | **Vercel** |

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/albertomontagnese/progetto-gare.git
cd progetto-gare
npm install
```

### 2. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `OPENAI_API_KEY` | OpenAI API key | [platform.openai.com](https://platform.openai.com/api-keys) |
| `OPENAI_MODEL` | Model to use (default: `gpt-4.1-mini`) | - |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID | [console.cloud.google.com](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_EMAIL` | Service account email | GCP IAM > Service Accounts |
| `GOOGLE_PRIVATE_KEY` | Service account private key (PEM format with `\n`) | GCP IAM > Service Accounts > Keys |
| `GCS_BUCKET_NAME` | GCS bucket for file uploads | GCP Storage > Create bucket |
| `NEXTAUTH_URL` | Your app URL (`http://localhost:3000` for local) | - |
| `NEXTAUTH_SECRET` | Random 32+ char secret for JWT signing | `openssl rand -base64 32` |
| `RESEND_API_KEY` | Resend API key for sending emails | [resend.com](https://resend.com) |
| `RESEND_FROM_EMAIL` | Verified sender email in Resend | Resend dashboard |

> **Tip for Vercel:** Use `GOOGLE_PRIVATE_KEY_BASE64` instead of `GOOGLE_PRIVATE_KEY` to avoid newline encoding issues. Generate it with:
> ```bash
> cat your-service-account-key.json | jq -r '.private_key' | base64 | tr -d '\n'
> ```

### 3. GCP Setup

Make sure your GCP project has:

- **Firestore** enabled (Native mode) - [Enable here](https://console.cloud.google.com/firestore)
- **Cloud Storage** bucket created:
  ```bash
  gcloud storage buckets create gs://YOUR_BUCKET_NAME --location=EU
  ```
- **Service account** with roles:
  - `Cloud Datastore User` (Firestore)
  - `Storage Object Admin` (GCS)

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll see the login page.

### 5. Create your first account

1. Enter your email on the login page
2. Click **"Accesso rapido"** to skip email verification during development
3. You'll be created as an **admin** user with a new company

For production, use the magic link flow (Resend sends you a login link via email).

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login & signup pages
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   └── admin/page.tsx   # Team management (admin only)
│   ├── api/
│   │   ├── auth/            # Auth endpoints (login, verify, signup, session)
│   │   ├── admin/           # Admin endpoints (invite, team list)
│   │   ├── gare/            # Tender CRUD, chat, upload, Q/A, checklist
│   │   ├── workspace/       # Company profile, CV upload
│   │   └── llm/             # Structured analysis
│   ├── page.tsx             # Main app (3-panel layout)
│   ├── layout.tsx           # Root layout with metadata
│   └── globals.css          # Tailwind + custom styles
├── components/
│   ├── app/                 # App-specific components
│   │   ├── sidebar-left.tsx
│   │   ├── chat-panel.tsx
│   │   ├── sidebar-right.tsx
│   │   ├── upload-dialog.tsx
│   │   └── company-profile-panel.tsx
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── firestore.ts         # Firestore client (tenant-scoped)
│   ├── gcs.ts               # Google Cloud Storage client
│   ├── openai.ts            # OpenAI API helpers
│   ├── gara-logic.ts        # Business logic (checklist, Q/A, classification)
│   ├── auth-db.ts           # User, tenant, invitation Firestore helpers
│   ├── resend.ts            # Email sending (magic links, invitations)
│   ├── session.ts           # JWT session management
│   └── types.ts             # TypeScript type definitions
└── middleware.ts             # Route protection (redirects to /login)
```

## Multi-Tenancy

Each company gets isolated data:

```
Firestore:
  tenants/{tenantId}/
    gare/{garaId}              # Tender data
    conversations/{garaId}     # Chat history
    gara_documents/{garaId}    # Uploaded document metadata
    workspace/company_profile  # Company profile

  users/{email}                # User accounts (global)
  invitations/{id}             # Pending invitations (global)
```

## Auth Flow

1. **Login** (`/login`): Enter email → receive magic link via Resend
2. **Verify** (`/api/auth/verify`): Click link → JWT session cookie set
3. **Signup** (`/signup`): First-time users complete name + company setup
4. **Invite**: Admins invite via `/admin` → invitee gets email → clicks link → joins team

The **"Accesso rapido"** button on the login page creates an account immediately without email verification (useful for local development).

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Send magic link email |
| GET | `/api/auth/verify` | Verify magic link token |
| POST | `/api/auth/signup` | Complete registration |
| GET/DEL | `/api/auth/session` | Get/destroy session |
| POST | `/api/auth/dev-login` | Quick login (skip email) |
| GET/POST | `/api/gare` | List / create tenders |
| GET/POST | `/api/gare/[id]` | Get / update tender output |
| POST | `/api/gare/[id]/chat` | Send message, update output |
| POST | `/api/gare/[id]/upload` | Upload & classify documents |
| POST | `/api/gare/[id]/document-classification/confirm` | Confirm + extract |
| POST | `/api/gare/[id]/qa/generate` | Generate guided questions |
| POST | `/api/gare/[id]/qa/answer` | Submit Q/A answer |
| POST | `/api/gare/[id]/qa/autofill` | AI auto-fill a requirement |
| POST | `/api/gare/[id]/checklist/progress` | Update checklist item |
| POST | `/api/admin/invite` | Invite user to team |
| GET | `/api/admin/team` | List team members |

## Deploy to Vercel

```bash
vercel --prod
```

Set all env vars in the Vercel dashboard or via CLI:

```bash
echo "YOUR_VALUE" | vercel env add VARIABLE_NAME production
```

> Use `GOOGLE_PRIVATE_KEY_BASE64` on Vercel (not `GOOGLE_PRIVATE_KEY`).

## License

Private / Proprietary.
