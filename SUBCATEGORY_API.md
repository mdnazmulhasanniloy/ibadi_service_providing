# Subcategory CRUD API

## Base URL

```text
/api/v1/subcategories
```

Create, update এবং delete endpoint ব্যবহারের জন্য admin, sub-admin অথবা super-admin access token প্রয়োজন। Get All এবং Get by ID public endpoint।

## 1. Create Subcategory

```http
POST /api/v1/subcategories
Authorization: Bearer <admin-token>
Content-Type: application/json
```

### JSON body

```json
{
  "name": "Personal Care",
  "categoryId": "68a1234567890abcdef12345",
  "image": "https://example.com/images/personal-care.png"
}
```

### Multipart image upload

`Content-Type: multipart/form-data` ব্যবহার করে নিচের fields পাঠাতে হবে:

- `image`: image file
- `data`: JSON string

`data` field-এর value:

```json
{
  "name": "Personal Care",
  "categoryId": "68a1234567890abcdef12345"
}
```

### Success response

```json
{
  "success": true,
  "message": "SubCategories created successfully",
  "data": {
    "id": "68b1234567890abcdef12345",
    "name": "Personal Care",
    "categoryId": "68a1234567890abcdef12345",
    "image": "https://example.com/images/personal-care.png",
    "isDeleted": false,
    "createdAt": "2026-08-12T10:00:00.000Z",
    "updatedAt": "2026-08-12T10:00:00.000Z"
  }
}
```

## 2. Update Subcategory

```http
PATCH /api/v1/subcategories/:id
Authorization: Bearer <admin-token>
Content-Type: application/json
```

সব fields optional, তবে অন্তত একটি field দিতে হবে।

```json
{
  "name": "Updated Personal Care",
  "categoryId": "68a1234567890abcdef12345",
  "image": "https://example.com/images/updated-personal-care.png"
}
```

শুধু একটি field-ও update করা যাবে:

```json
{
  "name": "Updated Personal Care"
}
```

নতুন image file upload করতে Create endpoint-এর মতো `multipart/form-data` ব্যবহার করুন।

## 3. Get All Subcategories

```http
GET /api/v1/subcategories
```

### Query parameters

| Parameter | Example | Description |
| --- | --- | --- |
| `page` | `1` | Current page |
| `limit` | `10` | Items per page |
| `searchTerm` | `care` | Search by subcategory name |
| `categoryId` | `68a1234567890abcdef12345` | Filter by category |
| `sort` | `-createdAt` | Sort descending by creation time |

Example:

```text
/api/v1/subcategories?page=1&limit=10&searchTerm=care&categoryId=68a1234567890abcdef12345&sort=-createdAt
```

### Success response

```json
{
  "success": true,
  "message": "All subCategories fetched successfully",
  "data": {
    "data": [
      {
        "id": "68b1234567890abcdef12345",
        "name": "Personal Care",
        "categoryId": "68a1234567890abcdef12345",
        "image": "https://example.com/images/personal-care.png",
        "isDeleted": false,
        "createdAt": "2026-08-12T10:00:00.000Z",
        "updatedAt": "2026-08-12T10:00:00.000Z",
        "category": {
          "id": "68a1234567890abcdef12345",
          "name": "Care Services",
          "image": "https://example.com/images/care-services.png",
          "isDeleted": false
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1
    }
  }
}
```

## 4. Get Subcategory by ID

```http
GET /api/v1/subcategories/:id
```

Example:

```text
/api/v1/subcategories/68b1234567890abcdef12345
```

### Success response

```json
{
  "success": true,
  "message": "SubCategories fetched successfully",
  "data": {
    "id": "68b1234567890abcdef12345",
    "name": "Personal Care",
    "categoryId": "68a1234567890abcdef12345",
    "image": "https://example.com/images/personal-care.png",
    "isDeleted": false,
    "category": {
      "id": "68a1234567890abcdef12345",
      "name": "Care Services"
    }
  }
}
```

## 5. Delete Subcategory

```http
DELETE /api/v1/subcategories/:id
Authorization: Bearer <admin-token>
```

এই endpoint subcategory-টি soft delete করবে এবং associated S3 image থাকলে সেটিও delete করবে।

### Success response

```json
{
  "success": true,
  "message": "SubCategories deleted successfully",
  "data": {
    "id": "68b1234567890abcdef12345",
    "name": "Personal Care",
    "categoryId": "68a1234567890abcdef12345",
    "image": "https://example.com/images/personal-care.png",
    "isDeleted": true
  }
}
```

## Validation rules

- `name`: required during creation, maximum 120 characters
- `categoryId`: required during creation and must be a valid 24-character MongoDB ObjectId
- `image`: required during JSON creation and must be a valid URL; multipart upload করলে uploaded S3 URL automatically ব্যবহার হবে
- Update request-এ অন্তত একটি valid field থাকতে হবে
- Parent category অবশ্যই database-এ থাকতে হবে এবং deleted হওয়া যাবে না

