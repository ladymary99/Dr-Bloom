# Dr-Bloom

Dr-Bloom is a full-stack Hospital Management System designed to support modern healthcare operations across both administrative and patient-facing workflows. The project is split into two main parts:

- A Laravel backend for API logic, business rules, authentication, roles, and data management
- A Next.js frontend for dashboards, hospital pages, patient portal, and administrator interfaces

This repository is organized as a complete healthcare platform foundation for managing patients, doctors, appointments, departments, billing, pharmacy, labs, inventory, and hospital operations.

## Project overview

The goal of Dr-Bloom is to provide a digital hospital ecosystem where different user groups can work in a structured way:

- Admins manage users, roles, departments, settings, finance, and reports
- Doctors handle patient visits, queue, prescriptions, and medical records
- Nurses and support staff manage appointments, admissions, beds, and ward operations
- Patients can register, manage appointments, view records, and pay bills through a patient portal
- Front office staff can manage appointments, contacts, and hospital communication

The system follows a role-based architecture and is built around a hospital workflow rather than a generic CRUD application.

## Why this project matters

Healthcare management requires reliable tracking of:

- patient information and medical history
- appointment scheduling
- doctor availability and visits
- admissions and bed allocation
- pharmacy dispensing and inventory
- medical billing and payments
- reports and audit trails

Dr-Bloom brings these functions together in one platform so healthcare teams can manage operations from a centralized system.

## Architecture

### Backend: Laravel
The backend lives in [hms-backend](hms-backend) and is built with Laravel 13. It acts as the application core and API server.

Key backend responsibilities include:

- authentication and user sessions
- permission and role enforcement
- patient, staff, and department management
- medical visits and appointments
- payment, invoice, and finance summaries
- inventory and stock tracking
- lab and pharmacy operations
- hospital announcement and settings management
- audit logging and reporting

The backend uses Laravel Sanctum for API authentication and Spatie Laravel Permission for role-based access control. This gives the system a secure workflow where specific modules are only accessible to users with matching permissions.

### Frontend: Next.js
The frontend lives in [hms-frontend](hms-frontend) and is built with Next.js, React, TypeScript, and Tailwind CSS.

Key frontend responsibilities include:

- patient and admin dashboard views
- appointment scheduling and tracking
- doctor queue and consultation workflow
- patient portal pages
- hospital homepage and public info pages
- staff administration screens
- reporting and finance visualizations

The frontend is designed to feel like a modern healthcare management dashboard, with clear navigation, KPI cards, status indicators, and operational panels.

## Main modules and features

### 1. Authentication and user management
The system supports different account types and role-specific access.

Included flows:

- patient registration
- admin and staff login
- role-based permission checks
- password updates
- user management for administrators

This allows the platform to differentiate between patient access and staff/admin access.

### 2. Patient management
Patient records are a core part of the system.

Features include:

- patient registration
- patient profile management
- MRN-based identification
- medical history access for authorized users
- patient dashboards and summaries

This makes patient data easier to track across visits, appointments, bills, and treatment history.

### 3. Appointment and consultation workflow
Appointments are central to hospital operations.

Features include:

- scheduling appointments
- upcoming and past appointment tracking
- doctor queue management
- visit creation during consultation
- clinical documentation and patient visit history

The doctor queue and consultation process is designed around real hospital activity flow, where patients are seen, diagnosed, and triaged.

### 4. Department and staff management
The system supports hospital organization by department and staff role.

Features include:

- department creation and updates
- doctor and staff profiles
- active/inactive staff visibility
- staff role and responsibility tracking
- department-specific analytics and performance

This helps map responsibilities and services to the correct team or unit.

### 5. Ward, bed, and admission management
The project includes operational support for inpatient care.

Features include:

- ward creation and management
- bed tracking
- occupancy status
- admissions and discharge flow
- bed usage and room status insight

These modules support the inpatient department and ensure hospital capacity is monitored.

### 6. Lab and pharmacy operations
The backend includes dedicated controllers and endpoints for hospital clinical support functions.

Features include:

- lab tests and results handling
- pharmacy prescription workflows
- medication dispensing records
- stock visibility and low-stock warnings

This gives the hospital a complete medical service workflow beyond patient consultation.

### 7. Inventory and stock tracking
Inventory management is built into the system for hospital supplies and drug stock.

Features include:

- stock item creation and updates
- minimum stock thresholds
- low-stock alerts
- department-linked inventory records

This helps prevent shortages and supports operational efficiency.

### 8. Billing, finance, and invoice management
Financial tracking is a critical part of a healthcare platform.

Features include:

- invoice creation and update
- payment status tracking
- finance summaries
- department performance reporting
- billing dashboards and collections data

This allows finance and administrative teams to monitor revenue, payments, and service performance.

### 9. Reports and analytics
The dashboard and API include analytics logic for hospital KPIs.

Features include:

- patient growth trends
- visit trends
- department performance metrics
- finance summary information
- patient and appointment reports
- export-ready reporting endpoints

This gives leadership a more data-driven understanding of hospital activity.

### 10. Audit logs and administration
The backend includes audit capability, which is important in healthcare environments:

- activity logging for key administrative actions
- user visibility in system activity
- monitoring of audit trails
- admin-only access to audit records

This supports accountability and compliance-oriented healthcare management.

### 11. Public and patient portal experience
The frontend includes both a public-facing hospital website and a patient portal.

Public site features include:

- homepage
- About page
- Services page
- Doctors page
- Contact page

Patient portal features include:

- personalized dashboard
- appointment overview
- medical record lookup
- upcoming appointment summaries
- billing and payables overview
- appointment booking

This creates a better experience for patients while supporting a modern healthcare brand.

## Repository structure

```text
Dr-Bloom/
├── README.md
├── composer.json
├── hms-backend/
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── public/
│   ├── resources/
│   ├── routes/
│   ├── tests/
│   ├── composer.json
│   └── artisan
├── hms-frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── eslint.config.mjs
└── vendor/
```

## Tech stack

### Backend
- PHP
- Laravel 13
- Sanctum
- Spatie Permission
- MySQL/PostgreSQL/SQLite-compatible database support
- PHPUnit for testing

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios
- Zustand

## User roles and access patterns

The system is strongly designed around role-based access, with permissions controlling what each group can do.

Common roles include:

- Admin
- Doctor
- Nurse
- Reception
- Patient

Examples of role-based behavior:

- Admins can manage users, settings, announcements, finance, and audits
- Doctors access queue and consultation functionality
- Pharmacy staff manage prescriptions and dispensing
- Patients access their own portal and appointment history

## Key user workflows

### For administrators
- manage staff and departments
- review hospital operations and analytics
- monitor finances, collections, and performance
- manage announcements and platform settings
- review audit logs and contact submissions

### For doctors
- see patient queue
- start consultations
- create medical visits
- add prescriptions
- review patient history

### For patients
- create an account
- book appointments
- view upcoming care and visit records
- check prescriptions and billing
- access personalized dashboard information

## Current project status

This repository is clearly in the early-to-mid development stage and already includes a substantial foundation for a hospital management platform. The structure and codebase show the project is not just a UI mockup; it includes:

- a working Laravel API layer
- role-based access logic
- multiple healthcare-related modules
- a modern Next.js frontend
- patient portal and dashboard flows
- operational and reporting elements

It is a strong starting point for a production-ready or near-production hospital management system.

## Local development workflow

To run the project locally, the general flow is:

1. Install backend dependencies in [hms-backend](hms-backend)
2. Configure the local database and application settings for the backend
3. Run Laravel migrations and start the API server
4. Install frontend dependencies in [hms-frontend](hms-frontend)
5. Start the Next.js app

Example flow:

```bash
cd hms-backend
composer install
php artisan migrate
php artisan serve
```

```bash
cd hms-frontend
pnpm install
pnpm dev
```

This allows the frontend to interact with the Laravel backend through API endpoints.

## Summary

Dr-Bloom is a hospital management system built to support the full healthcare operation lifecycle. It combines patient management, staff workflows, clinical operations, billing, pharmacy, inventory, analytics, and a patient-facing portal into one cohesive project.

The codebase clearly reflects a serious effort to create a real-world hospital platform rather than a small demo, with both business logic and user interface designed around healthcare operations.
