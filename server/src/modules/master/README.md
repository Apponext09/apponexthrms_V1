# Master Module — Holiday Calendar Sub-Module API Documentation

This sub-module provides full lifecycle management for **Holiday Calendars**, **Holidays**, **Weekly Off Rules**, and **Organizational Calendar Assignments**.

## Base URLs
- Direct Master Route: `http://localhost:5000/api/master/holiday-calendars`
- V1 Route: `http://localhost:5000/api/v1/master/holiday-calendars`

---

## Headers
| Header | Description | Default / Example |
|---|---|---|
| `Content-Type` | JSON payload type | `application/json` |
| `Authorization` | Bearer JWT token *(optional if testing internally)* | `Bearer <JWT_TOKEN>` |
| `X-Organization-Id` | Organization / Tenant ID | `8` |
| `X-Company-Id` | Active Company ID *(optional)* | `1` |

---

## API Endpoints Summary

### 1. Create a New Holiday Calendar
- **Method**: `POST /api/master/holiday-calendars`
- **Status**: `201 Created` | `400 Bad Request` | `409 Conflict`
- **Payload**:
```json
{
  "calendar_name": "Calendar 2027 - North Region",
  "calendar_year": 2027,
  "company_id": 1,
  "region_id": 2,
  "location_id": 3,
  "description": "Standard North Region holiday schedule for 2027",
  "status": "Draft"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Holiday calendar created successfully.",
  "data": {
    "id": 1,
    "uuid": "4c9d318e-4eb6-42d8-bf5b-c2e7b8f9e612",
    "calendar_name": "Calendar 2027 - North Region",
    "calendar_year": 2027,
    "company_id": 1,
    "region_id": 2,
    "location_id": 3,
    "status": "Draft",
    "is_default": false
  }
}
```

---

### 2. List All Calendars (with Filters)
- **Method**: `GET /api/master/holiday-calendars`
- **Query Params**:
  - `company_id=1`
  - `region_id=2`
  - `location_id=3`
  - `year=2027`
  - `status=Draft`
  - `search=North`
- **Response**:
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 1,
      "calendar_name": "Calendar 2027 - North Region",
      "calendar_year": 2027,
      "status": "Draft",
      "total_holidays": 0
    }
  ]
}
```

---

### 3. Get Single Calendar (with Nested Holidays & Weekly-Offs)
- **Method**: `GET /api/master/holiday-calendars/:id`
- **Status**: `200 OK` | `404 Not Found`
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "calendar_name": "Calendar 2027 - North Region",
    "calendar_year": 2027,
    "status": "Draft",
    "holidays": [
      {
        "id": 10,
        "holiday_name": "Republic Day",
        "holiday_date": "2027-01-26",
        "holiday_type": "National",
        "is_optional": false
      }
    ],
    "weekly_off_rules": [
      {
        "id": 5,
        "week_day": "Sun",
        "off_type": "Full Day",
        "is_alternate": false
      },
      {
        "id": 6,
        "week_day": "Sat",
        "off_type": "Full Day",
        "is_alternate": true,
        "alternate_weeks": "2,4"
      }
    ],
    "assignments": []
  }
}
```

---

### 4. Update Calendar Details
- **Method**: `PUT /api/master/holiday-calendars/:id`
- **Payload**:
```json
{
  "calendar_name": "Calendar 2027 - North Region (Updated)",
  "description": "Updated holiday policy description"
}
```

---

### 5. Delete Calendar (Cascade Delete)
- **Method**: `DELETE /api/master/holiday-calendars/:id`
- **Response**:
```json
{
  "success": true,
  "message": "Holiday calendar and associated holidays/weekly-off rules deleted successfully."
}
```

---

### 6. Publish Calendar
- **Method**: `PATCH /api/master/holiday-calendars/:id/publish`
- **Transitions**: `Draft` $\rightarrow$ `Published`
- **Response**:
```json
{
  "success": true,
  "message": "Holiday calendar published successfully."
}
```

---

### 7. Add Holiday to Calendar (Single OR Bulk Month-Wise Upload)
- **Method**: `POST /api/v1/master/holiday-calendars/:id/holidays` (or `POST /api/v1/master/holiday-calendars/:id/holidays/bulk`)
- **Validation**:
  - `holiday_date` must fall within `calendar_year`
  - No duplicate date in same calendar (`409 Conflict`)
  - Cannot add to `Archived` calendar (`400 Bad Request`)

#### Option A: Bulk Month-Wise Holidays Upload (All 12 Months in 1 Request):
```json
{
  "holidays": [
    { "holiday_name": "New Year's Day", "holiday_date": "2027-01-01", "holiday_type": "Optional" },
    { "holiday_name": "Republic Day", "holiday_date": "2027-01-26", "holiday_type": "National" },
    { "holiday_name": "Maha Shivratri", "holiday_date": "2027-03-06", "holiday_type": "Festival" },
    { "holiday_name": "Holi", "holiday_date": "2027-03-24", "holiday_type": "Festival" },
    { "holiday_name": "Good Friday", "holiday_date": "2027-03-26", "holiday_type": "Festival" },
    { "holiday_name": "Eid al-Fitr", "holiday_date": "2027-04-09", "holiday_type": "Festival" },
    { "holiday_name": "Independence Day", "holiday_date": "2027-08-15", "holiday_type": "National" },
    { "holiday_name": "Janmashtami", "holiday_date": "2027-08-25", "holiday_type": "Festival" },
    { "holiday_name": "Gandhi Jayanti", "holiday_date": "2027-10-02", "holiday_type": "National" },
    { "holiday_name": "Dussehra", "holiday_date": "2027-10-10", "holiday_type": "Festival" },
    { "holiday_name": "Diwali", "holiday_date": "2027-10-29", "holiday_type": "Festival" },
    { "holiday_name": "Guru Nanak Jayanti", "holiday_date": "2027-11-14", "holiday_type": "Festival" },
    { "holiday_name": "Christmas", "holiday_date": "2027-12-25", "holiday_type": "Festival" }
  ]
}
```

#### Option B: Single Holiday:
```json
{
  "holiday_name": "Independence Day",
  "holiday_date": "2027-08-15",
  "holiday_type": "National",
  "is_optional": false,
  "description": "79th Independence Day"
}
```

- **Response**:
```json
{
  "success": true,
  "message": "13 holiday(s) added/updated in calendar successfully.",
  "count": 13,
  "data": [ ... ]
}
```

---

### 8. Update Holiday
- **Method**: `PUT /api/master/holiday-calendars/holidays/:holidayId`
- **Payload**:
```json
{
  "holiday_name": "Independence Day (National Holiday)",
  "is_optional": false
}
```

---

### 9. Delete Holiday
- **Method**: `DELETE /api/master/holiday-calendars/holidays/:holidayId`

---

### 10. Add / Batch Update Weekly Off Rules
- **Method**: `POST /api/master/holiday-calendars/:id/weekly-off`
- **Payload**:
```json
{
  "rules": [
    {
      "week_day": "Sun",
      "off_type": "Full Day",
      "is_alternate": false
    },
    {
      "week_day": "Sat",
      "off_type": "Full Day",
      "is_alternate": true,
      "alternate_weeks": "2,4"
    }
  ]
}
```

---

### 11. Assign Calendar to Organizational Scope
- **Method**: `POST /api/master/holiday-calendars/:id/assign`
- **Payload**:
```json
{
  "company_id": 1,
  "location_id": 3,
  "department_id": 2,
  "employee_group_id": null
}
```
