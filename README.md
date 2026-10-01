# Linen Track (Uniform Management System)

## Overview

**Linen Track** is a comprehensive, open-source, multi-tenant inventory management application designed to track and manage employee uniforms across various companies and their respective outlets. It enables businesses to handle the entire lifecycle of a uniform, from procurement (Goods Receipt Notes) to issuance, returns, and eventual disposal or loss. 

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

## Security

Linen Track is built with enterprise-grade security principles:
- **Authentication**: Secured primarily with Google OAuth 2.0 (Google Sign-In and GIS SDK). Uses secure, HTTP-only, and SameSite-configured cookies for session management.
- **Role-Based Access Control (RBAC)**: Strict access boundaries separating Super Admins, Company Admins, Outlet Managers, and other roles. Users can only access and modify data scoped to their assigned company or outlet.
- **Data Validation**: Strict input validation and sanitization using Pydantic models in FastAPI to prevent injection attacks and ensure data integrity.
- **Comprehensive Auditing**: Immutable activity logs tracking every data modification (create, update, delete) for full accountability and incident tracing.

## User Roles and Permissions

Access control is strictly enforced through a hierarchical role-based system:
1. **super_admin:** Has global access to all companies and outlets. Can create companies and manage company admins.
2. **company_admin:** Scoped to a specific company. Can manage all aspects of their company, including outlets, items, and users.
3. **company_manager:** Similar to company admin but generally focused on operations rather than user management.
4. **outlet_manager:** Scoped to specific assigned outlets. Can manage inventory, staff, and daily operations only within their assigned locations.
5. **issuer:** Limited to specific outlets with permissions focused solely on issuing and returning uniforms.
6. **auditor:** Scoped to a company. Has read-only access to view inventory levels and activity logs for compliance and auditing purposes.
7. **pending:** The default state for new sign-ups. Cannot access the system until an administrator assigns them a valid role and scope.

## Installation & Setup

### Requirements
- Python 3.10+
- Node.js 18+
- Yarn 1.x or npm
- MongoDB (Local or Atlas)

### Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python ../scripts/seed_db.py
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```
API runs at `http://localhost:8000`. 
Configure your local `backend/.env` with MongoDB settings and Google OAuth credentials.

### Frontend Setup
```bash
cd frontend
yarn install
yarn start
```
Frontend runs at `http://localhost:3000`. 
Configure `frontend/.env` to point to your backend API and add your `REACT_APP_GOOGLE_CLIENT_ID`.

## License & Open Source

This project is open-sourced under the **MIT License**. See the [LICENSE](LICENSE) file for more information.

## Developer & Contact Information

**Developer / Organization:** Feelia Information Technologies  
**Contact Email:** feelia@feelia.xyz
