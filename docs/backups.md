# Database Backup Strategy

## Overview

The Resume Builder uses PostgreSQL as its database. This document describes the backup and recovery procedures for production deployments.

## Backup Methods

### 1. pg_dump (Logical Backup)

Use `pg_dump` for periodic logical backups. These are portable across PostgreSQL versions and can be stored off-server.

```bash
# Full database backup with custom format (compressed)
pg_dump "$DATABASE_URL" -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Plain SQL format
pg_dump "$DATABASE_URL" -f backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. pg_dumpall (Cluster-Level Backup)

For backing up all databases and roles:

```bash
pg_dumpall -h localhost -U postgres -f cluster_backup_$(date +%Y%m%d).sql
```

### 3. Base Backup + WAL Archiving (Point-in-Time Recovery)

For production environments requiring point-in-time recovery (PITR):

1. Configure WAL archiving in `postgresql.conf`:
   ```ini
   archive_mode = on
   archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
   wal_level = replica
   ```

2. Take a base backup:
   ```bash
   pg_basebackup -h localhost -U postgres -D /var/lib/postgresql/backups/base -Fp -Xs -P
   ```

3. Restore to a specific point in time by creating `recovery.signal` and setting
   `restore_command` and `recovery_target_time` in `postgresql.conf` or
   `postgresql.auto.conf` (PostgreSQL 12+).

## Automated Backup Schedule

### Daily Logical Backups (Cron)

Add to crontab on the database server:

```cron
# Daily backup at 2:00 AM, keep 7 days
0 2 * * * pg_dump "$DATABASE_URL" -F c -f /backups/daily_$(date +\%Y\%m\%d).dump && find /backups -name "daily_*.dump" -mtime +7 -delete
```

### Weekly Full Backups

```cron
# Weekly full backup on Sunday at 1:00 AM, keep 4 weeks
0 1 * * 0 pg_dumpall -h localhost -U postgres -f /backups/weekly_$(date +\%Y\%m\%d).sql && find /backups -name "weekly_*.sql" -mtime +28 -delete
```

## Restoration Procedure

### From a Custom-Format Dump

```bash
# Drop and recreate the database (WARNING: destroys current data)
dropdb resume_builder
createdb resume_builder

# Restore from backup
pg_restore -d resume_builder backup_20250101_020000.dump
```

### From a Plain SQL File

```bash
psql "$DATABASE_URL" -f backup_20250101_020000.sql
```

### From Base Backup + WAL (PITR)

1. Stop PostgreSQL.
2. Replace the data directory with the base backup.
3. Create `recovery.signal` in the data directory.
4. Configure recovery in `postgresql.auto.conf` (PostgreSQL 12+):
   ```
   restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
   recovery_target_time = '2025-01-01 12:00:00'
   recovery_target_action = 'promote'
   ```
5. Start PostgreSQL. It will replay WAL files up to the target time.

PostgreSQL 11 and earlier use `recovery.conf` instead of `recovery.signal` and
the regular server configuration files.

## Off-Site Storage

- Upload encrypted backups to cloud storage (S3, GCS, Azure Blob):
  ```bash
  aws s3 cp /backups/daily_$(date +%Y%m%d).dump s3://my-bucket/postgres-backups/
  ```
- Use `gpg` for encryption before upload:
  ```bash
  gpg --symmetric --cipher-algo AES256 backup.dump
  ```

## Verification

Periodically verify backups by restoring to a test database:

```bash
createdb resume_builder_test
pg_restore -d resume_builder_test backup_20250101_020000.dump
psql resume_builder_test -c "SELECT count(*) FROM resumes;"
```

## Disaster Recovery RPO/RTO

| Metric | Target | Notes |
|--------|--------|-------|
| RPO (Recovery Point Objective) | 24 hours | Daily logical backups |
| RTO (Recovery Time Objective) | 1 hour | Restore from dump + restart app |
| RPO (with PITR) | 5 minutes | WAL archiving enabled |
| RTO (with PITR) | 30 minutes | Base backup + WAL replay |
