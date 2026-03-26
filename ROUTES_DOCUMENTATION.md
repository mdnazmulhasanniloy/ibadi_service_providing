# Routes Documentation - Role-Based Access

## 📌 Global Routes (No Role Restriction - Every User Can Access)

### Auth Module

- `POST /auth/login` - ✅ GLOBAL (public)
- `POST /auth/refresh-token` - ✅ GLOBAL (public)
- `PATCH /auth/forgot-password` - ✅ GLOBAL (public)
- `PATCH /auth/reset-password` - ✅ GLOBAL (public)

### OTP Module

- `POST /otp/verify-otp` - ✅ GLOBAL (public)
- `POST /otp/resend-otp` - ✅ GLOBAL (public)

### Users Module

- `POST /users` - ✅ GLOBAL (public registration)
- `GET /users/:id` - ✅ GLOBAL (public user lookup)

### Contents Module

- `GET /contents` - ✅ GLOBAL (public content view)

### WorkSchedule Module

- `GET /workSchedule` - ✅ GLOBAL (public list)
- `GET /workSchedule/:id` - ✅ GLOBAL (public detail)

---

## 🔐 Role-Restricted Routes

### Auth Module

- `PATCH /auth/change-password` - 🔒 Requires: `admin`, `sub_admin`, `supper_admin`, `user`
  - ❌ NOT available to: `service_provider`

### Users Module

- `GET /users` - 🔒 Requires: `admin` only
- `PATCH /users/update-my-profile` - 🔒 Requires: `admin`, `sub_admin`, `supper_admin`, `user`, `service_provider` (authenticated users only)
- `GET /users/my-profile` - 🔒 Requires: `admin`, `sub_admin`, `supper_admin`, `user`, `service_provider` (authenticated users only)
- `PATCH /users/:id` - 🔒 Requires: `admin`, `sub_admin`, `supper_admin` (admin roles only)
- `DELETE /users/:id` - 🔒 Requires: `admin`, `sub_admin`, `supper_admin` (admin roles only)
- `DELETE /users/delete-my-account` - 🔒 Requires: `admin`, `sub_admin`, `supper_admin`, `user`, `service_provider` (authenticated users only)

### Contents Module

- `PATCH /contents/:id` - 🔒 Requires: `admin`, `sub_admin`, `supper_admin` (admin roles only)

### Notifications Module

- `GET /notifications` - 🔒 Requires: authenticated user (all roles)
- `PATCH /notifications` - 🔒 Requires: authenticated user (all roles)
- `DELETE /notifications` - 🔒 Requires: authenticated user (all roles)

### WorkSchedule Module

- `POST /workSchedule` - 🔒 Requires: `service_provider` only
- `PATCH /workSchedule/:id` - 🔒 Requires: `service_provider` only
- `DELETE /workSchedule/:id` - 🔒 Requires: `service_provider` only

---

## 📊 Summary By Role

### Admin (admin, sub_admin, supper_admin)

- Full access to all user management endpoints
- Access to content management
- Can change password
- Access to all notifications
- Access to auth endpoints (login, refresh, forgot-password, reset-password)
- Public routes: OTP, contents list, workSchedule list

### Regular User (user)

- Can manage own profile (view, update, delete account)
- Can change password
- Access to notifications
- Public routes: Auth (login, refresh, forgot-password, reset-password), OTP, contents list, workSchedule list
- ❌ Cannot: View all users, manage other users, manage content, manage workSchedule

### Service Provider (service_provider)

- Can manage own workSchedule (create, update, delete)
- Can manage own profile (view, update, delete account)
- Access to notifications
- Public routes: Auth (login, refresh, forgot-password, reset-password), OTP, contents list, workSchedule list
- ❌ Cannot: Change password, view all users, manage other users, manage content

### Public/Guest (No Authentication)

- Login
- Refresh token
- Forgot password
- Reset password
- Verify OTP
- Resend OTP
- Create new user account (registration)
- View specific user by ID
- View public content
- View workSchedule list
- View specific workSchedule by ID
