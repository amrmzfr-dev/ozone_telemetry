# 🚀 Development Setup Guide

This guide will help you run both the frontend and backend of the Ozon Telemetry project with a single command.

## Prerequisites

Before running the project, make sure you have the following installed:

- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/downloads)

## Quick Start (Single Command)

### Option 1: PowerShell Script (Recommended for Windows)
```powershell
.\start-dev.ps1
```

### Option 2: Batch File
```cmd
start-dev.bat
```

### Option 3: NPM Script (from frontend directory)
```bash
cd frontend
npm run install:all
npm run migrate
npm run start:full
```

## 🔍 Find ESP32 Devices

To scan your network for connected ESP32 devices:

### PowerShell Scan
```powershell
.\scan-esp32.ps1
```

### Batch Scan
```cmd
scan-esp32.bat
```

## What These Scripts Do

1. **Check Prerequisites** - Verifies Python and Node.js are installed
2. **Install Dependencies** - Installs both frontend and backend dependencies
3. **Run Migrations** - Sets up the database
4. **Start Servers** - Launches both frontend and backend simultaneously

## Manual Setup (Step by Step)

If you prefer to set up manually or troubleshoot issues:

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Access Points

Once running, you can access:

- **Frontend**: http://localhost:5173
- **Backend API**: http://0.0.0.0:8000 (accessible from network)
- **Django Admin**: http://0.0.0.0:8000/admin

## Project Structure

```
P2-rnd/
├── backend/                 # Django REST API
│   ├── manage.py
│   ├── requirements.txt
│   └── ozontelemetry/
├── frontend/               # React + Vite frontend
│   ├── package.json
│   └── src/
├── OzonTelemetry/         # ESP32 firmware
└── start-dev.ps1          # PowerShell startup script
```

## Troubleshooting

### Common Issues

1. **Python not found**
   - Make sure Python is installed and added to PATH
   - Try running `python --version` in command prompt

2. **Node.js not found**
   - Make sure Node.js is installed and added to PATH
   - Try running `node --version` in command prompt

3. **Port already in use**
   - Backend runs on port 8000, frontend on 5173
   - Kill processes using these ports or change them in the scripts

4. **Database errors**
   - Delete `backend/db.sqlite3` and run migrations again
   - Make sure you're in the correct directory when running commands

### PowerShell Execution Policy

If you get execution policy errors with PowerShell:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Development Workflow

1. **Start Development**: Run `.\start-dev.ps1`
2. **Make Changes**: Edit code in your preferred editor
3. **View Changes**: Refresh browser to see frontend changes
4. **API Testing**: Use the backend API at http://localhost:8000
5. **Stop Servers**: Press `Ctrl+C` in the terminal

## Available NPM Scripts

From the `frontend` directory:

- `npm run dev` - Start frontend only
- `npm run start:backend` - Start backend only
- `npm run start:full` - Start both frontend and backend
- `npm run install:all` - Install all dependencies
- `npm run migrate` - Run database migrations
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Production Deployment

For production deployment, you'll need to:

1. Build the frontend: `npm run build`
2. Configure Django for production
3. Set up a proper database (PostgreSQL recommended)
4. Configure web server (Nginx + Gunicorn)

## Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Check that ports 8000 and 5173 are available
4. Review the console output for specific error messages

Happy coding! 🎉
