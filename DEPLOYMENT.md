# Mentara - Deployment Guide

## Quick Start with Docker

### Prerequisites
- Docker & Docker Compose installed
- Domain name (for production)
- SSL certificates (for HTTPS)

### 1. Clone and Setup
```bash
git clone <your-repo>
cd IB_Django
cp .env.example .env
# Edit .env with your actual values
```

### 2. Build and Run
```bash
# Development
docker-compose up --build

# Production (with env file)
docker-compose --env-file .env up -d
```

### 3. Initialize Database
```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py collectstatic --noinput
```

### 4. Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin: http://localhost:8000/admin

## Production Deployment

### Using DigitalOcean/AWS/GCP

1. **Provision Server**
   - 2 CPU, 4GB RAM minimum
   - Ubuntu 22.04 LTS

2. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot
   sudo certbot certonly --standalone -d your-domain.com
   # Copy certs to ./ssl/ directory
   ```

4. **Configure Environment**
   ```bash
   nano .env
   # Set DEBUG=False
   # Set strong SECRET_KEY
   # Configure production database
   # Add your domain to ALLOWED_HOSTS
   ```

5. **Deploy**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

6. **Setup Monitoring (Optional)**
   ```bash
   # Install Sentry SDK
   pip install sentry-sdk
   
   # Add to settings.py
   import sentry_sdk
   sentry_sdk.init(dsn="your-sentry-dsn")
   ```

### CI/CD with GitHub Actions

See `.github/workflows/deploy.yml` for automated deployment pipeline.

## Maintenance

### Backup Database
```bash
docker-compose exec db pg_dump -U postgres mentara_db > backup.sql
```

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Update Application
```bash
git pull
docker-compose down
docker-compose up --build -d
docker-compose exec backend python manage.py migrate
```

## Performance Tuning

### Nginx Caching
Uncomment caching directives in nginx.conf for static assets.

### Database Connection Pooling
Add pgbouncer service to docker-compose.yml.

### Redis Caching
Configure Django cache backend in settings.py.

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Set up fail2ban
- [ ] Regular security updates
- [ ] Database backups automated
- [ ] Environment variables secured
- [ ] CORS configured properly
- [ ] Rate limiting enabled

## Troubleshooting

### Database Connection Issues
```bash
docker-compose logs db
docker-compose exec db psql -U postgres
```

### Frontend Not Loading
```bash
docker-compose logs frontend
# Check VITE_BASE_API in .env
```

### Static Files Not Serving
```bash
docker-compose exec backend python manage.py collectstatic --noinput
docker-compose restart nginx
```

### Uploaded question images/PDFs not showing (production)

If your UI shows broken images and `/media/...` returns 404 in production, your uploads are not persisted.

- **Render disk option (recommended if staying on Render):** attach a persistent disk and set `MEDIA_ROOT` to the disk mount path (example: `/var/data/media`).
- **S3 option:** set `USE_S3=True` and configure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME` (and optional `AWS_S3_REGION_NAME`, `AWS_S3_ENDPOINT_URL`, `AWS_S3_CUSTOM_DOMAIN`).

Without one of the above, uploads may disappear after a redeploy/cold start and students won’t see the “question paper” images.

## Support

For issues, contact: team@mentara.com
