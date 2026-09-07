# Kudos System Specification

## Overview
A feature for the internal employee portal that enables users to recognize and appreciate their colleagues through a "kudos" system.

## Functional Requirements

### User Stories

#### US-001: Give Kudos
**As a** registered user  
**I want to** select another user from a list, write a short message of appreciation, and submit it  
**So that** I can recognize my colleague's contributions

**Acceptance Criteria:**
- User can access a "Give Kudos" form from the main navigation
- User can select a recipient from a searchable dropdown/list of all active employees
- User can write a message (max 500 characters)
- User can submit the kudos
- User receives confirmation upon successful submission
- The kudos appears in the public feed immediately after submission

#### US-002: View Kudos Feed
**As a** portal user  
**I want to** see a public feed of recently submitted kudos on the main dashboard  
**So that** I can stay informed about recognition happening across the organization

**Acceptance Criteria:**
- Feed displays on the main dashboard
- Shows the 20 most recent kudos by default
- Each kudos card displays: giver name, recipient name, message, and timestamp
- Feed auto-refreshes every 60 seconds
- Older kudos can be viewed via pagination or "Load More"

#### US-003: Moderate Kudos (Administrator)
**As an** administrator  
**I want to** hide or delete inappropriate kudos messages  
**So that** I can maintain content quality and remove any inappropriate or spam submissions

**Acceptance Criteria:**
- Administrators can access a moderation dashboard
- Moderation dashboard lists all kudos with filter options (all, visible, hidden)
- Administrator can toggle visibility of any kudos (hide/show)
- Administrator can permanently delete kudos
- Hidden kudos are not displayed in the public feed
- Deleted kudos are permanently removed from the system
- Administrator actions are logged for audit purposes

## Technical Design

### Database Schema

#### Users Table (existing)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Kudos Table
```sql
CREATE TABLE kudos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL CHECK (char_length(message) <= 500),
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kudos_created_at ON kudos(created_at DESC);
CREATE INDEX idx_kudos_is_visible ON kudos(is_visible);
```

#### Kudos Moderation Log Table
```sql
CREATE TABLE kudos_moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kudos_id UUID NOT NULL REFERENCES kudos(id) ON DELETE SET NULL,
    moderator_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('hide', 'show', 'delete')),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_kudos ON kudos_moderation_log(kudos_id);
CREATE INDEX idx_moderation_moderator ON kudos_moderation_log(moderator_id);
```

### API Endpoints

#### POST /api/kudos
Create a new kudos entry
- **Request Body:** `{ giver_id, recipient_id, message }`
- **Response:** `{ id, giver_id, recipient_id, message, created_at }`
- **Auth:** Required (user must be authenticated)
- **Validation:** 
  - giver_id must match authenticated user
  - recipient_id must be different from giver_id
  - message length <= 500 characters

#### GET /api/kudos/feed
Retrieve public kudos feed
- **Query Parameters:** `limit` (default: 20, max: 100), `offset` (default: 0)
- **Response:** Array of kudos objects (only where `is_visible = true`)
- **Auth:** Optional (public endpoint)

#### GET /api/kudos/moderation
Retrieve kudos for moderation (admin only)
- **Query Parameters:** `status` (all|visible|hidden), `limit`, `offset`
- **Response:** Array of kudos objects with full metadata
- **Auth:** Required (admin role)

#### PATCH /api/kudos/:id/visibility
Toggle visibility of a kudos (admin only)
- **Request Body:** `{ is_visible: boolean }`
- **Response:** Updated kudos object
- **Auth:** Required (admin role)
- **Side Effect:** Creates entry in kudos_moderation_log

#### DELETE /api/kudos/:id
Permanently delete a kudos (admin only)
- **Response:** 204 No Content
- **Auth:** Required (admin role)
- **Side Effect:** Creates entry in kudos_moderation_log before deletion

### Security Considerations
- All kudos creation requires authentication
- Giver cannot give kudos to themselves
- Rate limiting: max 10 kudos per user per hour
- Admin actions require elevated privileges
- All moderation actions are logged
