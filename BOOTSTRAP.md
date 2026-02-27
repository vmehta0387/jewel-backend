# Project Bootstrap Commands

## Backend Setup (NestJS)

```bash
# Create backend directory
cd SalesPlatform
mkdir backend
cd backend

# Initialize NestJS project
npm i -g @nestjs/cli
nest new . --skip-git

# Install dependencies
npm install @nestjs/typeorm typeorm mariadb
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcrypt class-validator class-transformer
npm install @nestjs/config

# Install dev dependencies
npm install -D @types/bcrypt @types/passport-jwt
```

## Frontend Setup (React + Vite)

```bash
# Create frontend directory
cd ../
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install dependencies
npm install
npm install react-router-dom
npm install @tanstack/react-query
npm install axios
npm install zustand
npm install react-hook-form
npm install tailwindcss postcss autoprefixer
npm install lucide-react

# Initialize Tailwind
npx tailwindcss init -p
```

## Database Setup

```bash
# Install MariaDB (Windows)
# Download from: https://mariadb.org/download/

# Create database
mysql -u root -p
CREATE DATABASE jewelry_platform;
USE jewelry_platform;
SOURCE DATABASE_SCHEMA.sql;
```

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=jewelry_platform
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=7d
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000/api
```

## Run Projects

```bash
# Backend
cd backend
npm run start:dev

# Frontend
cd frontend
npm run dev
```
