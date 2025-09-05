# VolunteerConnect

## Overview

VolunteerConnect is a comprehensive volunteer management platform built with a modern full-stack architecture. The application facilitates volunteer registration, opportunity discovery, and administrative management for nonprofit organizations. It features a React-based frontend with TypeScript, an Express.js backend, and includes integration capabilities with Salesforce for CRM functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

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

### Database Connection
- **Neon Database**: Cloud-native PostgreSQL with serverless capabilities
- **Connection Pooling**: Built-in connection management for optimal performance
- **Migration System**: Automated schema updates with rollback capabilities