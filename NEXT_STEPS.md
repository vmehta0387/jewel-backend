# Next Steps - Backend Setup

## Step 1: Install Node.js (if not installed)
Download from: https://nodejs.org/
Choose LTS version (20.x)

Verify installation:
```cmd
node --version
npm --version
```

## Step 2: Setup Backend

```cmd
cd backend
npm install
```

This will install:
- NestJS framework
- TypeORM (database)
- JWT authentication
- Bcrypt (password hashing)
- All dependencies

## Step 3: Configure Environment

Copy `.env.example` to `.env`:
```cmd
copy .env.example .env
```

Edit `.env` file with your database password:
```env
NODE_ENV=development
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DATABASE_NAME=jewelry_platform
JWT_SECRET=change_this_to_random_string_in_production
JWT_EXPIRATION=7d
```

## Step 4: Start Backend Server

```cmd
npm run start:dev
```

You should see:
```
Application is running on: http://localhost:3000
```

## Step 5: Test API

Open browser or Postman:
```
http://localhost:3000/api
```

---

## Next: Frontend Setup

```cmd
cd ../frontend
npm install
copy .env.example .env
npm run dev
```

Frontend will run on: http://localhost:5173

---

## Troubleshooting

### "npm not found"
Install Node.js first

### Database connection error
- Check MySQL/MariaDB is running (XAMPP Control Panel)
- Verify password in `.env` file
- Ensure database `jewelry_platform` exists

### Port 3000 already in use
Change PORT in `.env` to 3001 or 3002
