# API Documentation

## Authentication

All API endpoints (except `/auth/*`) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Register Company

**POST** `/api/auth/register`

Create a new company account with admin user.

**Request Body:**
```json
{
  "companyName": "ABC Irrigation",
  "adminEmail": "admin@abcirrigation.com",
  "adminPassword": "securepassword123",
  "adminName": "John Smith",
  "plan": "starter"
}
```

**Response:**
```json
{
  "message": "Company registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "admin@abcirrigation.com",
    "name": "John Smith",
    "role": "owner"
  },
  "company": {
    "id": "uuid",
    "name": "ABC Irrigation",
    "plan": "starter"
  }
}
```

### Login

**POST** `/api/auth/login`

Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "admin@abcirrigation.com",
  "password": "securepassword123"
}
```

## Company Management

### Get Company Profile

**GET** `/api/company`

Get current company information and settings.

**Response:**
```json
{
  "id": "uuid",
  "name": "ABC Irrigation",
  "email": "contact@abcirrigation.com",
  "phone": "(555) 123-4567",
  "website": "https://abcirrigation.com",
  "address_json": {
    "street": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zip": "78701"
  },
  "plan": "starter",
  "logo_url": "https://s3.../logo.png"
}
```

### Update Company Profile

**PATCH** `/api/company`

Update company information (admin only).

**Request Body:**
```json
{
  "name": "ABC Irrigation Services",
  "email": "info@abcirrigation.com",
  "phone": "(555) 123-4567",
  "website": "https://abcirrigation.com",
  "address": {
    "street": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zip": "78701"
  }
}
```

## Client Management

### List Clients

**GET** `/api/clients`

Get paginated list of clients.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50)
- `search` - Search by name
- `type` - Filter by `residential` or `commercial`

**Response:**
```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "Smith Residence",
      "contact_type": "residential",
      "billing_email": "john@smith.com",
      "phone": "(555) 987-6543",
      "site_count": 1,
      "last_inspection": "2025-08-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 127,
    "pages": 3
  }
}
```

### Create Client

**POST** `/api/clients`

Create a new client.

**Request Body:**
```json
{
  "name": "Smith Residence",
  "contact_type": "residential",
  "billing_email": "john@smith.com",
  "phone": "(555) 987-6543",
  "notes": "New customer from referral"
}
```

### Add Site to Client

**POST** `/api/clients/:id/sites`

Add a new site location for a client.

**Request Body:**
```json
{
  "nickname": "Main Property",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Austin",
    "state": "TX",
    "zip": "78702",
    "lat": 30.2672,
    "lng": -97.7431
  },
  "notes": "Backyard only, front is xeriscaped"
}
```

## Inspection Management

### Get Inspection Templates

**GET** `/api/inspections/templates`

Get available inspection templates for the company.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Repair Focused",
    "code": "repair_focused",
    "schema_json": { /* form schema */ },
    "callouts_json": { /* predefined callouts */ }
  },
  {
    "id": "uuid",
    "name": "Conservation Focused",
    "code": "conservation_focused",
    "schema_json": { /* form schema */ },
    "callouts_json": { /* predefined callouts */ }
  }
]
```

### Start New Inspection

**POST** `/api/inspections`

Create a new inspection record.

**Request Body:**
```json
{
  "site_id": "uuid",
  "template_id": "uuid",
  "tech_id": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "site_id": "uuid",
  "template_id": "uuid",
  "tech_id": "uuid",
  "started_at": "2025-08-20T09:00:00Z",
  "submitted_at": null
}
```

### Add Inspection Finding

**POST** `/api/inspections/:id/items`

Add a finding or callout to an inspection.

**Request Body:**
```json
{
  "zone_number": 3,
  "area_label": "Front Lawn Zone 3",
  "device_type": "valve",
  "callout_code": "BROKEN_HEAD",
  "severity": "medium",
  "notes": "Two spray heads broken, need replacement",
  "photos": ["file_uuid_1", "file_uuid_2"],
  "metadata": {
    "gps_lat": 30.2672,
    "gps_lng": -97.7431
  }
}
```

### Submit Inspection

**POST** `/api/inspections/:id/submit`

Mark inspection as complete and trigger PDF generation.

**Request Body:**
```json
{
  "program_settings": {
    "controller_model": "Hunter Pro-C",
    "zones_active": 8,
    "watering_days": ["Mon", "Wed", "Fri"],
    "start_times": ["06:00", "18:00"]
  },
  "summary_json": {
    "total_issues": 3,
    "critical_issues": 1,
    "estimated_water_savings": 25
  },
  "notes": "Overall system in good condition with minor repairs needed"
}
```

## Estimate Management

### Generate Estimate from Inspection

**POST** `/api/estimates/from-inspection/:inspection_id`

Auto-generate estimate from inspection callouts using price book.

**Response:**
```json
{
  "id": "uuid",
  "inspection_id": "uuid",
  "client_id": "uuid",
  "site_id": "uuid",
  "status": "draft",
  "subtotal_cents": 15750,
  "tax_cents": 1299,
  "total_cents": 17049,
  "currency": "USD"
}
```

### Get Estimate Details

**GET** `/api/estimates/:id`

Get estimate with line items.

**Response:**
```json
{
  "id": "uuid",
  "status": "draft",
  "subtotal_cents": 15750,
  "tax_cents": 1299,
  "total_cents": 17049,
  "currency": "USD",
  "client_name": "Smith Residence",
  "site_name": "Main Property",
  "items": [
    {
      "id": "uuid",
      "description": "2\" Spray Head Replacement",
      "qty": 2,
      "unit": "each",
      "unit_price_cents": 500,
      "line_total_cents": 1000,
      "category": "Heads"
    },
    {
      "id": "uuid",
      "description": "Labor - Replace Head (15 min)",
      "qty": 0.5,
      "unit": "hour",
      "unit_price_cents": 7500,
      "line_total_cents": 3750,
      "category": "Labor"
    }
  ]
}
```

## Price Book Management

### Get Price Books

**GET** `/api/price-books`

List all price books for the company.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Default Price Book",
    "description": "Standard pricing for residential jobs",
    "is_active": true,
    "item_count": 145
  }
]
```

### Get Price Book Items

**GET** `/api/price-books/:id/items`

Get items in a price book, optionally filtered by category.

**Query Parameters:**
- `category` - Filter by category (e.g., "Heads", "Valves", "Labor")
- `search` - Search by name, SKU, or description
- `active_only` - Show only active items (default: true)

### Add Price Book Item

**POST** `/api/price-books/:id/items`

Add new item to price book.

**Request Body:**
```json
{
  "sku": "HEAD-SPRAY-4IN",
  "name": "4\" Spray Head",
  "category": "Heads",
  "description": "Standard 4\" pop-up spray head",
  "unit": "each",
  "cost_cents": 350,
  "price_cents": 700,
  "tax_rate_pct": 8.25
}
```

### Import Price Book Items

**POST** `/api/price-books/:id/import`

Bulk import items from CSV data.

**Request Body:**
```json
{
  "items": [
    {
      "sku": "VALVE-1IN",
      "name": "1\" Control Valve",
      "category": "Valves",
      "unit": "each",
      "cost_cents": 2500,
      "price_cents": 5000
    }
  ]
}
```

## User Management

### List Users

**GET** `/api/users`

Get all users in the company.

**Query Parameters:**
- `role` - Filter by role (owner, admin, tech, viewer)
- `active_only` - Show only active users (default: true)

### Create User (Invite)

**POST** `/api/users`

Create new user account (admin only).

**Request Body:**
```json
{
  "email": "tech@abcirrigation.com",
  "full_name": "Mike Johnson",
  "role": "tech",
  "phone": "(555) 444-3333"
}
```

### Get User Performance

**GET** `/api/users/:id/stats`

Get performance statistics for a user.

**Query Parameters:**
- `start_date` - Filter from date (ISO 8601)
- `end_date` - Filter to date (ISO 8601)

**Response:**
```json
{
  "stats": {
    "total_inspections": 45,
    "completed_inspections": 42,
    "in_progress_inspections": 3,
    "avg_inspection_hours": 2.3,
    "unique_clients": 18,
    "unique_sites": 23
  },
  "recent_inspections": [
    {
      "id": "uuid",
      "started_at": "2025-08-19T14:00:00Z",
      "submitted_at": "2025-08-19T16:30:00Z",
      "site_name": "Oak Street Property",
      "client_name": "Johnson Residence"
    }
  ]
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common HTTP Status Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Rate Limiting

API requests are limited to 100 requests per 15-minute window per IP address. Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1692547200
```
