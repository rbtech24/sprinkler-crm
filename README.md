# Sprinkler Repair SaaS - Full-Stack Platform

A comprehensive SaaS platform for sprinkler inspection, CRM, and field service management designed specifically for irrigation professionals.

## 🎯 Product Overview

This platform offers two integrated product tracks:

### 1. Lightweight Inspection Tool (Phase 1-2)
- **Company Registration & Branding** - Custom logos, business info for branded reports
- **Technician Management** - Mobile-friendly accounts with role-based access
- **Client & Site Management** - Google Maps integration, multi-site clients
- **Dynamic Inspection Forms** - Repair-focused and conservation-focused templates
- **Professional PDF Reports** - Auto-generated with company branding
- **Price Book & Estimating** - Turn findings into instant estimates

### 2. Full CRM Platform (Phase 3-4)
- **Complete CRM** - Client management, contact history, communication tracking
- **Job Scheduling** - Calendar integration, technician dispatch
- **Work Order Management** - Convert estimates to scheduled jobs
- **Advanced Analytics** - Water savings reports, performance metrics
- **Invoicing & Payments** - Stripe integration, QuickBooks sync
- **Inventory Management** - Parts tracking, auto-restock alerts

## 🏗️ Architecture

### Database Layer
- **PostgreSQL** with multi-tenant architecture
- **Row Level Security (RLS)** for company data isolation
- **JSON Schema** for dynamic form building
- **Background job processing** for PDF generation and webhooks

### Backend API
- **Node.js + Express** REST API
- **JWT Authentication** with role-based permissions
- **Stripe Integration** for subscription management
- **File Upload** via AWS S3
- **PDF Generation** using Puppeteer

### Frontend (Planned)
- **React/Next.js** with TypeScript
- **Mobile-first design** for field technicians
- **Real-time updates** via WebSocket
- **Offline capability** for mobile inspections

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- AWS Account (for file storage)
- Stripe Account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sprinkler-repair-saas
   ```

2. **Set up the database**
   ```bash
   # Create database
   createdb sprinkler_repair_saas
   
   # Run setup and migrations
   cd database
   psql -d sprinkler_repair_saas -f setup.sql
   psql -d sprinkler_repair_saas -f migrations/001_initial_schema.sql
   ```

3. **Configure backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   ```

4. **Start the backend server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### Environment Configuration

Copy `backend/.env.example` to `backend/.env` and configure:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/sprinkler_repair_saas

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=sprinkler-repair-files

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📊 Database Schema

### Core Tables
- **companies** - Multi-tenant company data with branding
- **users** - Role-based user management (owner, admin, tech, viewer)
- **clients** - Customer information (residential/commercial)
- **sites** - Physical locations with GPS coordinates
- **inspections** - Inspection records with dynamic form data
- **inspection_items** - Individual findings and callouts
- **estimates** - Auto-generated estimates from inspections
- **price_books** - Customizable pricing catalogs
- **work_orders** - Scheduled jobs from approved estimates

### Key Features
- **Multi-tenancy** with RLS policies
- **Dynamic forms** via JSON schema
- **Auto-estimate generation** from inspection callouts
- **Background job processing** for PDFs and notifications
- **Audit logging** for compliance and tracking

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Company registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh

### Company Management
- `GET /api/company` - Get company profile
- `PATCH /api/company` - Update company settings
- `GET /api/company/stats` - Dashboard analytics

### Client & Site Management
- `GET /api/clients` - List clients with pagination
- `POST /api/clients` - Create new client
- `POST /api/clients/:id/sites` - Add site to client
- `GET /api/clients/:id/inspections` - Client inspection history

### Inspections
- `GET /api/inspections/templates` - Available inspection templates
- `POST /api/inspections` - Start new inspection
- `POST /api/inspections/:id/items` - Add inspection findings
- `POST /api/inspections/:id/submit` - Complete inspection

### Estimates & Pricing
- `POST /api/estimates/from-inspection/:id` - Auto-generate estimate
- `GET /api/price-books` - Company price books
- `POST /api/price-books/:id/items` - Add price book items
- `POST /api/price-books/:id/import` - Bulk import pricing

### User Management
- `GET /api/users` - List company users
- `POST /api/users` - Create new user (invite)
- `PATCH /api/users/:id` - Update user permissions
- `GET /api/users/:id/stats` - User performance metrics

## 🧪 Development

### Running Tests
```bash
cd backend
npm test
```

### Database Migrations
```bash
cd backend
npm run migrate
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## 🌊 Roadmap

### Phase 1: MVP Inspection Tool ✅
- [x] Database schema design
- [x] Backend API foundation
- [x] Authentication & multi-tenancy
- [x] Inspection templates
- [x] PDF generation system
- [ ] Frontend mobile app
- [ ] Company registration flow

### Phase 2: Estimating System
- [ ] Price book management UI
- [ ] Auto-estimate generation
- [ ] PDF estimate templates
- [ ] E-signature integration
- [ ] Parts list generation

### Phase 3: CRM Lite
- [ ] Calendar scheduling
- [ ] Work order management
- [ ] Client portal
- [ ] Basic reporting
- [ ] Email notifications

### Phase 4: Full CRM Platform
- [ ] Advanced analytics
- [ ] Inventory management
- [ ] Invoicing & payments
- [ ] QuickBooks integration
- [ ] White-label options
- [ ] Mobile optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@sprinklerrepairsaas.com or create an issue in this repository.

---

Built with ❤️ for irrigation professionals who want to modernize their business operations.
