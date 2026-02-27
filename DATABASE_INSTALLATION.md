# MariaDB Installation Guide (Windows)

## Option 1: MariaDB (Recommended - Lightweight)

### Step 1: Download MariaDB
1. Go to: https://mariadb.org/download/
2. Select:
   - Version: 11.2 (Stable)
   - OS: Windows
   - Package Type: MSI Package
3. Click "Download"

### Step 2: Install MariaDB
1. Run the downloaded `.msi` file
2. Click "Next" through the wizard
3. **IMPORTANT**: On "Set root password" screen:
   - Enter a password (remember this!)
   - Example: `root123` (change in production)
4. Keep default settings
5. Check "Enable access from remote machines" if needed
6. Click "Install"

### Step 3: Verify Installation
Open Command Prompt and run:
```cmd
mysql --version
```

### Step 4: Login to MariaDB
```cmd
mysql -u root -p
```
Enter your password when prompted.

### Step 5: Create Database
```sql
CREATE DATABASE jewelry_platform;
USE jewelry_platform;
SOURCE C:\Users\visha\OneDrive\Documents\BitAce\Jewlery Sales Network Platform\SalesPlatform\DATABASE_SCHEMA.sql;
```

---

## Option 2: XAMPP (Easiest - Includes GUI)

### Step 1: Download XAMPP
1. Go to: https://www.apachefriends.org/
2. Download XAMPP for Windows
3. Run installer

### Step 2: Install XAMPP
1. Select components: Apache, MySQL, phpMyAdmin
2. Install to `C:\xampp`
3. Finish installation

### Step 3: Start MySQL
1. Open XAMPP Control Panel
2. Click "Start" next to MySQL
3. Wait for green highlight

### Step 4: Access phpMyAdmin
1. Open browser: http://localhost/phpmyadmin
2. Click "New" to create database
3. Database name: `jewelry_platform`
4. Click "Create"

### Step 5: Import Schema
1. Click on `jewelry_platform` database
2. Click "Import" tab
3. Click "Choose File"
4. Select: `DATABASE_SCHEMA.sql`
5. Click "Go"

---

## Option 3: MySQL (Alternative)

### Step 1: Download MySQL
1. Go to: https://dev.mysql.com/downloads/installer/
2. Download "MySQL Installer for Windows"
3. Choose "mysql-installer-community"

### Step 2: Install MySQL
1. Run installer
2. Choose "Developer Default"
3. Click "Next" and "Execute"
4. Set root password
5. Complete installation

### Step 3: Use MySQL Workbench
1. Open MySQL Workbench (installed with MySQL)
2. Connect to localhost
3. Create database and import schema

---

## Quick Test After Installation

### Test Connection:
```cmd
mysql -u root -p
```

### Verify Database:
```sql
SHOW DATABASES;
USE jewelry_platform;
SHOW TABLES;
```

You should see 13 tables:
- users
- companies
- branches
- ring_styles
- configuration_options
- product_media
- gold_prices
- diamond_prices
- pricing_rules
- orders
- order_items
- order_approvals

---

## Update Backend .env File

After installation, update `backend/.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=your_password_here
DATABASE_NAME=jewelry_platform
```

---

## Troubleshooting

### "mysql is not recognized"
Add to PATH:
- MariaDB: `C:\Program Files\MariaDB 11.2\bin`
- XAMPP: `C:\xampp\mysql\bin`
- MySQL: `C:\Program Files\MySQL\MySQL Server 8.0\bin`

### Port 3306 already in use
Stop other MySQL/MariaDB services in Task Manager

### Can't connect from Node.js
Check firewall settings and ensure MySQL is running
