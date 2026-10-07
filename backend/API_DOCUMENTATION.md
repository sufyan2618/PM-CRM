# API Documentation (Frontend Handover)

Base URL: `http://localhost:5000`

Auth Base Path: `/api/auth`

All responses are JSON.

## Common Response Format

Success:
```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "message": "Human readable error message"
}
```

## Authentication Details

- Login returns an `accessToken` in response body.
- Login also sets an HTTP-only cookie named `refreshToken`.
- Protected APIs require:
  - `Authorization: Bearer <accessToken>`
- Token refresh uses:
  - Cookie (`refreshToken`) via `POST /api/auth/refresh-token`
- Use `credentials: "include"` for login/refresh/logout calls.

## User Shape

Returned user object:
```json
{
  "id": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "user@example.com",
  "isVerified": true,
  "isBlocked": false,
  "createdAt": "ISO date string",
  "updatedAt": "ISO date string"
}
```

## Validation Rules

### Password Rule
- Minimum 6 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character from: `@$!%*?&`

### OTP Rule
- Exactly 6 characters (string)

### Purpose Field
- Allowed values: `verify_email` or `reset_password`

## Endpoints

### 1) Register
`POST /api/auth/register`

Request body:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Abc@123"
}
```

Success (`201`):
```json
{
  "success": true,
  "message": "Registered successfully. OTP sent to email.",
  "data": {
    "id": "USER_ID",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "isVerified": false,
    "isBlocked": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Common errors:
- `409` User already exists
- `400` Validation errors
- `429` Email limit reached. Please try again later.

---

### 2) Verify OTP
`POST /api/auth/verify-otp`

Request body:
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "purpose": "verify_email"
}
```

Success (`200`):
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

Common errors:
- `404` User not found
- `400` No OTP found / OTP purpose mismatch / Invalid OTP / OTP expired

---

### 3) Resend OTP
`POST /api/auth/resend-otp`

Request body:
```json
{
  "email": "john@example.com",
  "purpose": "verify_email"
}
```

Success (`200`):
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

Common errors:
- `404` User not found
- `429` Email limit reached. Please try again later.

---

### 4) Login
`POST /api/auth/login`

Request body:
```json
{
  "email": "john@example.com",
  "password": "Abc@123"
}
```

Success (`200`):
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "ACCESS_TOKEN",
  "data": {
    "id": "USER_ID",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "isVerified": true,
    "isBlocked": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
} 
```

Common errors:
- `401` Invalid credentials
- `403` Please verify your email first
- `403` Account blocked due to too many failed attempts

---

### 5) Refresh Access Token
`POST /api/auth/refresh-token`

No body required.

Requires refresh token cookie.

Success (`200`):
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "accessToken": "NEW_ACCESS_TOKEN"
}
```

Common errors:
- `401` Refresh token not found / Invalid refresh token / Refresh token mismatch / Refresh token expired
- `404` User not found

---

### 6) Logout
`POST /api/auth/logout`

Requires refresh token cookie (if available).

Success (`200`):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

Common errors:
- none (safe logout behavior)

---

### 7) Profile (Protected)
`GET /api/auth/profile`

Headers (if not using cookie):
```http
Authorization: Bearer <accessToken>
```

Success (`200`):
```json
{
  "success": true,
  "data": {
    "id": "USER_ID",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "isVerified": true,
    "isBlocked": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Common errors:
- `401` Unauthorized / Invalid token
- `404` User not found

---

### 8) Reset Password (Send OTP)
`POST /api/auth/reset-password`

Request body:
```json
{
  "email": "john@example.com"
}
```

Success (`200`):
```json
{
  "success": true,
  "message": "Password reset OTP sent"
}
```

Common errors:
- `404` User not found
- `429` Email limit reached. Please try again later.

---

### 9) Update Password
`POST /api/auth/update-password`

Request body:
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "New@123"
}
```

Success (`200`):
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

Common errors:
- `404` User not found
- `400` No reset OTP found / Invalid OTP / OTP expired
- `400` Validation errors (new password rule)

## Health Endpoint

`GET /api/health`

Success (`200`):
```json
{
  "success": true,
  "message": "Server is healthy"
}
```

## Rate Limits

- Global: `100 requests / minute / IP`
- Auth routes: `10 requests / minute / IP`
- Email sending related actions: `5 emails / 30 minutes / user`

## Frontend Integration Notes

- Recommended to centralize API error handling on `message`.
- For cookie-based auth, set:
  - `withCredentials: true` (Axios), or
  - `credentials: "include"` (fetch)
- On app start, call `/api/auth/refresh-token` (with credentials) to get a fresh access token.
- Send `Authorization: Bearer <accessToken>` for protected routes.
