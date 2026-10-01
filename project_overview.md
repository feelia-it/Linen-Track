# Uniform Management System

## Overview
The **Uniform Management System** is a comprehensive multi-tenant inventory management application designed to track and manage employee uniforms across various companies and their respective outlets. It enables businesses to handle the entire lifecycle of a uniform, from procurement (Goods Receipt Notes) to issuance, returns, and eventual disposal or loss. 

The project utilizes a modern technology stack:
- **Backend:** Python with FastAPI
- **Frontend:** React
- **Database:** MongoDB (Motor for asynchronous operations)

## Key Features

- **Multi-Tenancy Support:** Manages multiple companies, each with its own set of outlets, vendors, staff, and inventory.
- **Inventory Management:** Tracks items by size, unique code, and condition (new, old, damaged). Monitors stock levels including opening stock, received, issued, returned, discarded, and lost items. Includes low stock thresholds.
- **Item Master:** Define uniform types, categories (e.g., Shirt, Trouser, Coat), and departments (e.g., HOH, FOH, Admin). Supports size tracking and condition tracking.
- **Goods Receipt Note (GRN):** Record incoming inventory from vendors, updating stock levels automatically.
- **Issuance and Returns:** Issue uniforms to specific staff members and process returns, maintaining a full history of possession.
- **Vendor & Staff Management:** Maintain directories of suppliers and employees.
- **Audit Trails:** Comprehensive activity logging system that records all critical actions (creates, updates, deletes) across the platform for accountability.

## Authentication (Auth)

The system employs a robust authentication mechanism:
- **Google OAuth 2.0:** Primary authentication method supporting Google Sign-In and Google One Tap (GIS SDK).
- **Session Management:** Utilizes secure, HTTP-only session cookies (`session_token`) for maintaining user state.
- **API Access:** Supports Bearer token authentication via the `Authorization` header for API clients.
- **Local Testing Mode:** Includes fallback/dev authentication endpoints for local development without requiring Google OAuth configuration.

## User Roles and Permissions

Access control is strictly enforced through a hierarchical role-based system:

1. **super_admin:** Has global access to all companies and outlets. Can create companies and manage company admins.
2. **company_admin:** Scoped to a specific company. Can manage all aspects of their company, including outlets, items, and users.
3. **company_manager:** Similar to company admin but generally focused on operations rather than user management.
4. **outlet_manager:** Scoped to specific assigned outlets. Can manage inventory, staff, and daily operations only within their assigned locations.
5. **issuer:** Limited to specific outlets with permissions focused solely on issuing and returning uniforms.
6. **auditor:** Scoped to a company. Has read-only access to view inventory levels and activity logs for compliance and auditing purposes.
7. **pending:** The default state for new sign-ups. Cannot access the system until an administrator assigns them a valid role and scope.
