# API Reference - Programs, Workshops, and Participants

## Programs API

### GET /api/programs
Get all programs with optional filters.

**Query Parameters:**
- `status` (optional): Filter by status (e.g., "active", "inactive")
- `search` (optional): Search by name or description

**Example:**
```typescript
GET /api/programs?status=active&search=Financial
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Financial Futures",
    "description": "8-week program for ages 22+",
    "duration": "8-week program",
    "ageRange": "ages 22+",
    "status": "active",
    "startDate": "2025-03-01T00:00:00Z",
    "endDate": "2025-04-26T00:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### GET /api/programs/:id
Get a specific program by ID.

### POST /api/programs
Create a new program.

**Request Body:**
```json
{
  "name": "Financial Futures",
  "description": "8-week program for ages 22+",
  "duration": "8-week program",
  "ageRange": "ages 22+",
  "status": "active",
  "startDate": "2025-03-01T00:00:00Z",
  "endDate": "2025-04-26T00:00:00Z"
}
```

### PUT /api/programs/:id
Update a program.

### DELETE /api/programs/:id
Delete a program.

---

## Workshops API

### GET /api/workshops
Get all workshops with optional filters.

**Query Parameters:**
- `programId` (optional): Filter by program ID
- `status` (optional): Filter by status (e.g., "scheduled", "completed", "cancelled")
- `search` (optional): Search by title or description

**Example:**
```typescript
GET /api/workshops?programId=uuid&status=scheduled
```

**Response:**
```json
[
  {
    "id": "uuid",
    "programId": "uuid",
    "title": "Budgeting Basics",
    "description": "Learn the fundamentals of budgeting",
    "date": "2025-04-01T10:00:00Z",
    "startTime": "10:00 AM",
    "endTime": "11:30 AM",
    "location": "Community Center",
    "maxParticipants": 20,
    "currentParticipants": 5,
    "status": "scheduled",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### GET /api/workshops/:id
Get a specific workshop by ID.

### POST /api/workshops
Create a new workshop.

**Request Body:**
```json
{
  "programId": "uuid",
  "title": "Budgeting Basics",
  "description": "Learn the fundamentals of budgeting",
  "date": "2025-04-01T10:00:00Z",
  "startTime": "10:00 AM",
  "endTime": "11:30 AM",
  "location": "Community Center",
  "maxParticipants": 20,
  "status": "scheduled"
}
```

### PUT /api/workshops/:id
Update a workshop.

### DELETE /api/workshops/:id
Delete a workshop.

---

## Participants API

### GET /api/participants
Get all participants with optional filters.

**Query Parameters:**
- `programId` (optional): Filter by program ID
- `status` (optional): Filter by status (e.g., "enrolled", "completed", "withdrawn", "waitlisted")
- `search` (optional): Search by name or email

**Example:**
```typescript
GET /api/participants?programId=uuid&status=enrolled
```

**Response:**
```json
[
  {
    "id": "uuid",
    "programId": "uuid",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phone": "555-1234",
    "status": "enrolled",
    "enrollmentDate": "2025-01-15T00:00:00Z",
    "createdAt": "2025-01-15T00:00:00Z",
    "updatedAt": "2025-01-15T00:00:00Z"
  }
]
```

### GET /api/participants/:id
Get a specific participant by ID.

### POST /api/participants
Create a new participant.

**Request Body:**
```json
{
  "programId": "uuid",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "555-1234",
  "status": "enrolled"
}
```

### PUT /api/participants/:id
Update a participant.

### DELETE /api/participants/:id
Delete a participant.

---

## Participant-Workshop Registrations API

### GET /api/participant-workshops
Get all participant-workshop registrations.

**Query Parameters:**
- `participantId` (optional): Filter by participant ID
- `workshopId` (optional): Filter by workshop ID

**Example:**
```typescript
GET /api/participant-workshops?workshopId=uuid
```

**Response:**
```json
[
  {
    "id": "uuid",
    "participantId": "uuid",
    "workshopId": "uuid",
    "attendanceStatus": "registered",
    "notes": null,
    "createdAt": "2025-01-20T00:00:00Z",
    "updatedAt": "2025-01-20T00:00:00Z"
  }
]
```

### POST /api/participant-workshops
Register a participant for a workshop.

**Request Body:**
```json
{
  "participantId": "uuid",
  "workshopId": "uuid",
  "attendanceStatus": "registered",
  "notes": "Optional notes"
}
```

### PUT /api/participant-workshops/:id
Update a registration (e.g., mark attendance).

**Request Body:**
```json
{
  "attendanceStatus": "attended",
  "notes": "Participant attended and completed all activities"
}
```

### DELETE /api/participant-workshops/:participantId/:workshopId
Remove a participant from a workshop.

---

## React Query Hooks

We've created custom React Query hooks for easy integration:

### Programs
- `usePrograms(filters?)` - Get all programs
- `useProgram(id)` - Get a specific program
- `useCreateProgram()` - Create a program mutation
- `useUpdateProgram()` - Update a program mutation
- `useDeleteProgram()` - Delete a program mutation

### Workshops
- `useWorkshops(filters?)` - Get all workshops
- `useWorkshop(id)` - Get a specific workshop
- `useCreateWorkshop()` - Create a workshop mutation
- `useUpdateWorkshop()` - Update a workshop mutation
- `useDeleteWorkshop()` - Delete a workshop mutation

### Participants
- `useParticipants(filters?)` - Get all participants
- `useParticipant(id)` - Get a specific participant
- `useCreateParticipant()` - Create a participant mutation
- `useUpdateParticipant()` - Update a participant mutation
- `useDeleteParticipant()` - Delete a participant mutation

### Participant-Workshop Registrations
- `useParticipantWorkshops(participantId?, workshopId?)` - Get registrations
- `useRegisterParticipantForWorkshop()` - Register a participant mutation
- `useUpdateParticipantWorkshop()` - Update registration mutation
- `useRemoveParticipantFromWorkshop()` - Remove registration mutation

See `client/src/hooks/query-examples.ts` for usage examples.

