# Database Backup Strategy

## Overview

The Resume Builder uses PostgreSQL as its database. This document describes
backup and recovery procedures for production deployments.

## Backup Methods

### 1. pg_dump (Logical Backup)

Use `pg_dump` for periodic logical backups. These are portable across
PostgreSQL versions and can be stored off-server.

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

   This local archive command demonstrates the mechanism only. A production
   PITR design must copy WAL to durable off-site storage, alert on archiver
   failures, retain enough WAL for the recovery window, and monitor restore lag.

2. Take a base backup:

   ```bash
   pg_basebackup -h localhost -U postgres \
     -D /var/lib/postgresql/backups/base -Fp -Xs -P
   ```

3. Restore to a specific point in time by creating `recovery.signal` and setting
   `restore_command` and `recovery_target_time` in `postgresql.conf` or
   `postgresql.auto.conf` (PostgreSQL 12+).

## Automated Backup Schedule

### Daily Logical Backups (Cron)

Create a root-owned environment file such as
`/etc/resume-builder/backup.env` (mode `0600`) containing `DATABASE_URL`, then
load it from the backup user's crontab. Cron has a minimal environment, so do
not assume the application process's variables are available:

<!-- markdownlint-disable MD013 -->

```cron
# Daily backup at 2:00 AM, keep 7 days
0 2 * * * . /etc/resume-builder/backup.env && pg_dump "$DATABASE_URL" -F c -f /backups/daily_$(date +\%Y\%m\%d).dump && find /backups -name "daily_*.dump" -mtime +7 -delete
```

<!-- markdownlint-enable MD013 -->

### Weekly Full Backups

Install this entry in the `postgres` operating-system account's crontab when
local peer authentication is enabled. Otherwise, configure a mode-`0600`
`.pgpass` for the account running the job. The `-w` flag makes the unattended
job fail instead of waiting for a password prompt:

<!-- markdownlint-disable MD013 -->

```cron
# Weekly full backup on Sunday at 1:00 AM, keep 4 weeks
0 1 * * 0 pg_dumpall -w -h localhost -U postgres -f /backups/weekly_$(date +\%Y\%m\%d).sql && find /backups -name "weekly_*.sql" -mtime +28 -delete
```

<!-- markdownlint-enable MD013 -->

## Restoration Procedure

### From a Custom-Format Dump

```bash
# Supply explicit URLs for the intended cluster; use .pgpass for credentials.
export MAINTENANCE_DATABASE_URL=postgresql://username@db-host:5432/postgres
export TARGET_DATABASE_URL=postgresql://username@db-host:5432/resume_builder

# Drop and recreate the database (WARNING: destroys current data)
dropdb --maintenance-db="$MAINTENANCE_DATABASE_URL" resume_builder
createdb --maintenance-db="$MAINTENANCE_DATABASE_URL" resume_builder

# Restore from backup
pg_restore --exit-on-error --dbname="$TARGET_DATABASE_URL" backup_20250101_020000.dump
```

### From a Plain SQL File

```bash
psql "$TARGET_DATABASE_URL" --set=ON_ERROR_STOP=1 \
  -f backup_20250101_020000.sql
```

### From Base Backup + WAL (PITR)

1. Stop PostgreSQL.
2. Replace the data directory with the base backup.
3. Create `recovery.signal` in the data directory.
4. Configure recovery in `postgresql.auto.conf` (PostgreSQL 12+):

   ```ini
   restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
   recovery_target_time = '2025-01-01 12:00:00'
   recovery_target_action = 'promote'
   ```

5. Start PostgreSQL. It will replay WAL files up to the target time.

PostgreSQL 11 and earlier put recovery and standby settings such as
`restore_command` and recovery-target options in `recovery.conf`. Ordinary
server settings remain in `postgresql.conf` and the usual configuration files.

## Encrypted Off-Site Storage

Encrypt the dated backup first, then upload only the encrypted output. Symmetric
encryption prompts for a passphrase unless a secret is supplied through a
separately secured automation mechanism.

```bash
backup="/backups/daily_$(date +%Y%m%d).dump"
gpg --symmetric --cipher-algo AES256 --output "${backup}.gpg" "$backup"
aws s3 cp "${backup}.gpg" s3://my-bucket/postgres-backups/
```

## Verification

Periodically verify backups by restoring to a test database:

```bash
export MAINTENANCE_DATABASE_URL=postgresql://username@db-host:5432/postgres
export TEST_DATABASE_URL=postgresql://username@db-host:5432/resume_builder_test
createdb --maintenance-db="$MAINTENANCE_DATABASE_URL" resume_builder_test
pg_restore --exit-on-error --dbname="$TEST_DATABASE_URL" backup_20250101_020000.dump
psql "$TEST_DATABASE_URL" --set=ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF to_regclass('public.resumes') IS NULL THEN
    RAISE EXCEPTION 'resumes table is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resumes'
      AND column_name IN ('id', 'title', 'content', 'updated_at')
    GROUP BY table_schema, table_name
    HAVING count(*) = 4
  ) THEN
    RAISE EXCEPTION 'resumes table is missing required columns';
  END IF;
END $$;
SELECT count(*) AS restored_resume_rows FROM public.resumes;
SQL
```

## Disaster Recovery RPO/RTO

<!-- markdownlint-disable MD013 -->

| Metric | Target | Notes |
| --- | --- | --- |
| RPO (Recovery Point Objective) | 24 hours | Daily logical backups |
| RTO (Recovery Time Objective) | 1 hour | Restore from dump + restart app |
| RPO (with PITR) | 5 minutes (conditional target) | Requires durable off-site WAL shipping, archive-failure alerts, sufficient retention, and tested lag at or below five minutes; the local archive example alone does not meet this target |
| RTO (with PITR) | 30 minutes | Base backup + WAL replay |

<!-- markdownlint-enable MD013 -->
