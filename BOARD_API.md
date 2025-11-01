# Board API Documentation

## 📋 Board Routes

Всі board routes вимагають аутентифікації (Bearer token).

---

## 🔐 Authentication

Спочатку отримай токен через login:

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "123456"
}
```

**Відповідь:**
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 📌 Endpoints

### 1. Get All Boards

Отримати всі дошки користувача.

```http
GET http://localhost:3000/api/boards
Authorization: Bearer YOUR_TOKEN_HERE
```

**Відповідь (є дошки):**
```json
{
  "boards": [
    {
      "id": 1,
      "title": "My First Board",
      "ownerId": 1,
      "createdAt": "2025-10-30T12:00:00.000Z",
      "updatedAt": "2025-10-30T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Відповідь (немає дошок):**
```json
{
  "boards": [],
  "count": 0,
  "message": "Ще не створено жодної дошки"
}
```

---

### 2. Get Board by ID

Отримати конкретну дошку за ID.

```http
GET http://localhost:3000/api/boards/1
Authorization: Bearer YOUR_TOKEN_HERE
```

**Відповідь:**
```json
{
  "board": {
    "id": 1,
    "title": "My First Board",
    "ownerId": 1,
    "createdAt": "2025-10-30T12:00:00.000Z",
    "updatedAt": "2025-10-30T12:00:00.000Z"
  }
}
```

**Помилки:**
- `404` - Board not found or you do not have access
- `400` - Invalid board ID

---

### 3. Create Board

Створити нову дошку.

```http
POST http://localhost:3000/api/boards
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "title": "My New Board"
}
```

**Відповідь:**
```json
{
  "message": "Board created successfully",
  "board": {
    "id": 2,
    "title": "My New Board",
    "ownerId": 1,
    "createdAt": "2025-10-30T12:00:00.000Z",
    "updatedAt": "2025-10-30T12:00:00.000Z"
  }
}
```

**Валідація:**
- `title` - required, min 1 char, max 100 chars

**Помилки:**
- `400` - Validation Error
- `401` - Unauthorized

---

### 4. Update Board

Оновити дошку.

```http
PUT http://localhost:3000/api/boards/1
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "title": "Updated Board Title"
}
```

**Відповідь:**
```json
{
  "message": "Board updated successfully",
  "board": {
    "id": 1,
    "title": "Updated Board Title",
    "ownerId": 1,
    "createdAt": "2025-10-30T12:00:00.000Z",
    "updatedAt": "2025-10-30T12:30:00.000Z"
  }
}
```

**Помилки:**
- `404` - Board not found or you do not have permission
- `400` - Invalid board ID or validation error
- `401` - Unauthorized

---

### 5. Delete Board

Видалити дошку (cascade видалить всі lists і cards).

```http
DELETE http://localhost:3000/api/boards/1
Authorization: Bearer YOUR_TOKEN_HERE
```

**Відповідь:**
```json
{
  "message": "Board deleted successfully"
}
```

**Помилки:**
- `404` - Board not found or you do not have permission
- `400` - Invalid board ID
- `401` - Unauthorized

---

## 🔒 Authorization Rules

- ✅ Користувач може бачити тільки **свої** дошки
- ✅ Тільки **власник** може оновлювати дошку
- ✅ Тільки **власник** може видаляти дошку
- ⚠️ При видаленні дошки всі пов'язані lists і cards також видаляються (cascade)

---

## 🧪 Приклади використання

### JavaScript (Fetch)

```javascript
// Get all boards
const getBoards = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3000/api/boards', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  console.log(data.boards);
};

// Create board
const createBoard = async (title) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3000/api/boards', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });
  
  const data = await response.json();
  console.log(data.board);
};

// Update board
const updateBoard = async (id, title) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`http://localhost:3000/api/boards/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });
  
  const data = await response.json();
  console.log(data.board);
};

// Delete board
const deleteBoard = async (id) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`http://localhost:3000/api/boards/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  console.log(data.message);
};
```

### Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

// Get all boards
const boards = await api.get('/boards');

// Create board
const newBoard = await api.post('/boards', { title: 'My Board' });

// Update board
const updated = await api.put('/boards/1', { title: 'Updated' });

// Delete board
await api.delete('/boards/1');
```

---

## 🚀 Тестування в Postman / Thunder Client

1. **Login** → Отримай токен
2. Створи **Environment Variable**: `token`
3. Використовуй `{{token}}` в Authorization header
4. Тестуй всі endpoints!

---

## 📊 HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success (GET, PUT, DELETE) |
| `201` | Created (POST) |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (no token or invalid) |
| `403` | Forbidden (no permission) |
| `404` | Not Found (board doesn't exist) |
| `500` | Internal Server Error |

---

## ✨ Features

- ✅ CRUD операції для boards
- ✅ Аутентифікація через JWT
- ✅ Авторизація (тільки власник)
- ✅ Валідація даних (Zod)
- ✅ TypeScript
- ✅ Cascade delete (видаляє lists і cards)

---

## 🔜 Next Steps

Тепер можна додати:
1. **List routes** - для списків на дошці
2. **Card routes** - для карток у списках
3. **Activity routes** - для історії змін
4. **Board members** - для спільного доступу


