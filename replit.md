# VolunteerConnect - Women's Money Matters

## Overview

VolunteerConnect has been customized for Women's Money Matters, a nonprofit organization focused on financial empowerment for women and girls living on low incomes. The application facilitates volunteer registration and opportunity discovery specifically for their Financial Futures and Life Launch Collective programs. It features a React-based frontend with TypeScript, an Express.js backend, and includes integration capabilities with Salesforce for CRM functionality.

## Organization Details

**Client**: Women's Money Matters (womensmoneymatters.org)
**Mission**: Building financial wellness, confidence, and security for women and girls living on low incomes
**Programs**:
- Financial Futures: 8-week program for ages 22+
- Life Launch Collective: 12-week program for ages 16-22

**Volunteer Roles**:
- Financial Coaches: Provide 1-to-1 mentoring and support
- Workshop Presenters: Lead financial literacy workshops
- Program Support: Administrative and event assistance

## User Preferences

Preferred communication style: Simple, everyday language.
Color scheme: Green branding to match organization identity.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming and customization
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling and request logging
- **Data Layer**: Drizzle ORM for type-safe database operations with PostgreSQL
- **Storage**: In-memory storage implementation with interface for easy database migration

### Database Design
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Key Entities**:
  - Volunteers: Complete profile management with interests, contact info, and status tracking
  - Opportunities: Event management with categories, scheduling, and capacity tracking
  - Volunteer Signups: Many-to-many relationship between volunteers and opportunities

### Development Environment
- **Dev Server**: Vite development server with HMR (Hot Module Replacement)
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation
- **Type Safety**: Shared TypeScript types between frontend and backend
- **Code Quality**: Consistent alias configuration for clean imports

### Authentication & Authorization
- Currently implemented with basic session management
- Prepared for expansion with role-based access control
- Admin dashboard with volunteer management capabilities

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon serverless PostgreSQL driver for cloud database connectivity
- **drizzle-orm & drizzle-kit**: Type-safe ORM and migration tools for PostgreSQL
- **@tanstack/react-query**: Server state management and caching for React
- **@radix-ui/***: Comprehensive suite of accessible UI primitives
- **react-hook-form**: Performant form library with minimal re-renders
- **zod**: TypeScript-first schema validation library

### UI & Styling
- **tailwindcss**: Utility-first CSS framework for rapid UI development
- **class-variance-authority**: Type-safe variant API for component styling
- **lucide-react**: Modern icon library with consistent design
- **date-fns**: Date utility library for formatting and manipulation

### Development Tools
- **vite**: Fast build tool with instant HMR for development
- **typescript**: Static type checking for JavaScript
- **wouter**: Minimalist routing library for React applications

### Salesforce Integration
- **Python Integration**: Prepared infrastructure for Salesforce API communication
- **CRM Sync**: Bidirectional synchronization capabilities for volunteer and opportunity data
- **Authentication**: Environment-based configuration for Salesforce credentials
- **Custom Objects**: Configured to work with Women's Money Matters' Salesforce custom objects

### Database Connection
- **Neon Database**: Cloud-native PostgreSQL with serverless capabilities
- **Connection Pooling**: Built-in connection management for optimal performance
- **Migration System**: Automated schema updates with rollback capabilities

## Recent Customizations (September 2025)

### Branding Updates
- Updated application name and headers to reflect Women's Money Matters branding
- Changed color scheme to green to match organization identity
- Updated hero section messaging to focus on financial empowerment mission

### Volunteer Categories
Replaced generic volunteer categories with organization-specific roles:
- Financial Coaching (primary volunteer role)
- Workshop Presenting (for group education sessions)
- Program Support (administrative assistance)
- Administrative Support (office and logistics)
- Event Planning (program events and workshops)
- Community Outreach (recruitment and engagement)

### Sample Opportunities
Created realistic volunteer opportunities based on actual programs:
- Financial Futures Coach sessions (Monday and Saturday)
- Life Launch Collective presenter roles
- Administrative support for program logistics
- All opportunities reflect real program needs and scheduling

### Technical Updates
- Fixed SelectItem component errors in forms
- Updated type compatibility for nullable fields
- Maintained all existing functionality while customizing content