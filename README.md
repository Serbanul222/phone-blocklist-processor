# 📱 Phone Blocklist Processor

A modern web application for filtering phone numbers against a blocklist with real-time processing and beautiful user interface.

![Phone Blocklist Processor](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Python](https://img.shields.io/badge/Python-3.8+-blue?style=for-the-badge&logo=python)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker)

## ✨ Features

- 🎯 **Real-time Processing** - Live progress tracking with step-by-step visualization
- 📊 **Beautiful Interface** - Modern, responsive design with intuitive workflow
- 🔄 **Multi-format Support** - Process CSV and Excel files (.csv, .xlsx, .xls)
- 🌐 **Network Accessible** - Deploy on-premises for team access
- 📈 **Detailed Statistics** - Comprehensive processing reports and analytics
- 🔒 **Secure Processing** - Safe file handling with validation and cleanup
- 🐳 **Docker Ready** - One-click deployment with containerization
- ⚡ **High Performance** - Optimized for large datasets (900k+ records)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.8+
- Docker (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd phone-blocklist-processor
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🐳 Production Deployment

### Docker Deployment (Recommended)

1. **Prepare deployment**
   ```bash
   chmod +x deploy.sh
   ```

2. **Deploy to server**
   ```bash
   ./deploy.sh
   ```

3. **Access your application**
   ```
   http://192.168.101.50:8090
   ```

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   npm start
   ```

2. **Run Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## 📋 Usage

### Step-by-Step Process

1. **📁 Upload File**
   - Drag & drop or browse for CSV/Excel files
   - Maximum file size: 50MB
   - Supported formats: .csv, .xlsx, .xls

2. **🎯 Select Column**
   - Choose the column containing phone numbers
   - Preview data with sample values
   - Smart column detection for common phone fields

3. **⚙️ Processing**
   - Real-time progress with live statistics
   - Fetches latest blocklist from API
   - Normalizes phone numbers to E.164 format
   - Filters blocked numbers

4. **📊 View Results**
   - Detailed processing statistics
   - Before/after comparison
   - Performance metrics

5. **💾 Export**
   - Download filtered results
   - Excel (.xlsx) or CSV format
   - Preserves original data structure

### Supported Phone Formats

The application automatically normalizes various phone number formats:

- `+40723456789` (International)
- `0723456789` (National with leading zero)
- `40723456789` (Country code without +)
- `723456789` (Local format)

## 🛠️ Technical Architecture

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **Lucide React** - Consistent iconography

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Python Integration** - High-performance data processing
- **pandas** - Efficient data manipulation
- **openpyxl** - Excel file handling

### Infrastructure
- **Docker** - Containerized deployment
- **Multi-stage builds** - Optimized production images
- **Health checks** - System monitoring
- **Volume persistence** - File storage management

## 📊 Performance

- **Processing Speed**: ~900k records in 2-3 seconds
- **Memory Efficient**: Optimized pandas operations
- **File Support**: Up to 50MB input files
- **Concurrent Processing**: Thread-safe operations
- **Real-time Updates**: Live progress tracking

## 🔧 Configuration

### Environment Variables

```bash
# API Configuration
API_URL=https://api.sendsms.ro/json?action=blocklist_get&username=lensa&password=***

# File Upload
UPLOAD_MAX_SIZE=52428800

# Server Configuration
NODE_ENV=production
PORT=3000
TZ=Europe/Bucharest
```

### Docker Configuration

```yaml
# docker-compose.yml
services:
  phone-blocklist-app:
    ports:
      - "8090:3000"
    environment:
      - NODE_ENV=production
      - TZ=Europe/Bucharest
    volumes:
      - ./uploads:/app/uploads
```

## 📁 Project Structure

```
phone-blocklist-processor/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API endpoints
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Main application
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── FileUpload.tsx # File upload interface
│   │   ├── ColumnSelector.tsx
│   │   ├── ProcessingDashboard.tsx
│   │   ├── ResultsView.tsx
│   │   └── ExportPanel.tsx
│   ├── lib/               # Utility functions
│   └── types/             # TypeScript definitions
├── python_scripts/        # Python processing scripts
│   └── phone_processor_api.py
├── uploads/               # File storage (gitignored)
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Production container
├── requirements.txt      # Python dependencies
└── deploy.sh            # Deployment script
```

## 🔍 API Endpoints

### Health Check
```
GET /api/health
```
Returns system health status and component availability.

### File Upload
```
POST /api/upload
```
Uploads and validates CSV/Excel files, returns column information.

### Process Data
```
POST /api/process
```
Processes phone numbers against blocklist, returns statistics.

### Download Results
```
GET /api/download?fileId=xxx&format=xlsx
```
Downloads processed file in specified format.

## 🐛 Troubleshooting

### Common Issues

**1. Python Dependencies Missing**
```bash
pip install -r requirements.txt
```

**2. Permission Issues**
```bash
chmod +x deploy.sh
chmod 755 uploads/
```

**3. Port Already in Use**
```bash
# Change port in docker-compose.yml
ports:
  - "8091:3000"  # Use different port
```

**4. CSV Encoding Issues**
The application automatically handles various encodings:
- UTF-8 with BOM
- Latin1
- CP1252

### Logs

**View application logs:**
```bash
docker-compose logs -f
```

**View specific component:**
```bash
docker-compose logs -f phone-blocklist-app
```

## 📈 Monitoring

### Health Checks

The application includes built-in health monitoring:

- **System Health**: `/api/health`
- **Python Availability**: Automatic detection
- **File System**: Upload directory validation
- **Container Health**: Docker health checks

### Metrics

- Processing time per request
- File size and row counts
- Success/failure rates
- Resource utilization

## 🔒 Security

### Production Security Features

- **Non-root container** execution
- **Security headers** (CSP, XSS protection)
- **File validation** and sanitization
- **Input size limits**
- **Temporary file cleanup**
- **No sensitive data logging**

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For technical support or feature requests, please contact the development team.

---

**Built with ❤️ using Next.js, Python, and modern web technologies.**