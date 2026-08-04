import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: any;

  constructor(private config: ConfigService) {
    const driver = this.config.get('STORAGE_DRIVER', 'local');
    if (driver === 'r2') {
      try {
        const { S3Client } = require('@aws-sdk/client-s3');
        this.s3 = new S3Client({
          endpoint: this.config.get('S3_ENDPOINT'),
          region: this.config.get('S3_REGION', 'auto'),
          credentials: {
            accessKeyId: this.config.get('S3_ACCESS_KEY'),
            secretAccessKey: this.config.get('S3_SECRET_KEY'),
          },
        });
      } catch (e) {
        this.logger.warn('R2 driver requested but @aws-sdk/client-s3 is unavailable; using local storage.');
      }
    }
  }

  get publicBase(): string {
    if (this.s3) return this.config.get('S3_PUBLIC_URL', '');
    const port = this.config.get('PORT', '4000');
    return `http://localhost:${port}/uploads`;
  }

  async save(file: { originalname: string; buffer: Buffer; mimetype: string }, folder: string) {
    const ext = extname(file.originalname);
    const key = `${folder}/${randomUUID()}${ext}`;

    if (this.s3) {
      const bucket = this.config.get('S3_BUCKET');
      await this.s3.send(new (require('@aws-sdk/client-s3')).PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      const base = this.config.get('S3_PUBLIC_URL', '').replace(/\/$/, '');
      return { url: `${base}/${key}`, key };
    }

    const localPath = join(process.cwd(), 'uploads', key);
    await mkdir(join(process.cwd(), 'uploads', folder), { recursive: true });
    await writeFile(localPath, file.buffer);
    return { url: `/uploads/${key}`, key };
  }

  async remove(key: string) {
    if (!key) return;
    if (this.s3) {
      try {
        await this.s3.send(new (require('@aws-sdk/client-s3')).DeleteObjectCommand({
          Bucket: this.config.get('S3_BUCKET'),
          Key: key,
        }));
      } catch (e) {
        this.logger.warn(`S3 delete failed for ${key}`);
      }
    } else {
      try {
        const { unlink } = await import('fs/promises');
        await unlink(join(process.cwd(), key.startsWith('/') ? key.replace(/^\//, '') : key)).catch(() => null);
      } catch {
        /* ignore */
      }
    }
  }
}