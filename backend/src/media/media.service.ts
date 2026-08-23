import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);
    private s3: S3Client;
    private bucketName: string;
    private publicUrl: string;

    constructor(private prisma: PrismaService) {
        const accountId = process.env.R2_ACCOUNT_ID || '';
        const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
        this.bucketName = process.env.R2_BUCKET_NAME || 'whatshub-media';
        this.publicUrl = process.env.R2_PUBLIC_URL || ''; // e.g. https://media.yourdomain.com

        this.s3 = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
        });

        if (accessKeyId && secretAccessKey) {
            this.logger.log(`MediaService: Using Cloudflare R2 (bucket: ${this.bucketName})`);
        } else {
            this.logger.warn('MediaService: R2 credentials not set — uploads will fail!');
        }
    }

    async uploadFile(shopId: string, file: Express.Multer.File): Promise<{ id: string; fileUrl: string; fileType: string; fileSize: number; fileName: string | null }> {
        const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const key = `shops/${shopId}/${safeName}`;

        try {
            await this.s3.send(new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            }));

            // Public URL: either custom domain or R2 dev URL
            const fileUrl = this.publicUrl
                ? `${this.publicUrl}/${key}`
                : `https://${this.bucketName}.r2.dev/${key}`;

            const media = await this.prisma.mediaFile.create({
                data: {
                    shopId,
                    fileName: file.originalname,
                    fileUrl,
                    fileType: file.mimetype,
                    fileSize: file.size,
                },
            });

            this.logger.log(`Uploaded to R2: ${fileUrl}`);
            return media;
        } catch (error: any) {
            this.logger.error('R2 upload error:', error?.message || error);
            throw new InternalServerErrorException('Media file upload failed.');
        }
    }

    async getMediaFiles(shopId: string) {
        return this.prisma.mediaFile.findMany({
            where: { shopId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async deleteMediaFile(shopId: string, id: string) {
        const file = await this.prisma.mediaFile.findFirst({ where: { id, shopId } });
        if (!file) throw new NotFoundException('Media file not found');

        // Extract the R2 key from the URL
        try {
            let key = '';
            if (this.publicUrl && file.fileUrl.startsWith(this.publicUrl)) {
                key = file.fileUrl.replace(`${this.publicUrl}/`, '');
            } else {
                // Try extracting from r2.dev URL
                const match = file.fileUrl.match(/r2\.dev\/(.+)$/);
                if (match) key = match[1];
            }

            if (key) {
                await this.s3.send(new DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                }));
                this.logger.log(`Deleted from R2: ${key}`);
            }
        } catch (err: any) {
            this.logger.warn(`Could not delete from R2: ${err?.message}`);
        }

        return this.prisma.mediaFile.delete({ where: { id } });
    }

    /** Delete ALL media files for a shop (used for cleanup) */
    async deleteAllMediaFiles(shopId: string) {
        const files = await this.prisma.mediaFile.findMany({ where: { shopId } });

        for (const file of files) {
            try {
                let key = '';
                if (this.publicUrl && file.fileUrl.startsWith(this.publicUrl)) {
                    key = file.fileUrl.replace(`${this.publicUrl}/`, '');
                } else {
                    const match = file.fileUrl.match(/r2\.dev\/(.+)$/);
                    if (match) key = match[1];
                }
                if (key) {
                    await this.s3.send(new DeleteObjectCommand({
                        Bucket: this.bucketName,
                        Key: key,
                    }));
                }
            } catch { }
        }

        return this.prisma.mediaFile.deleteMany({ where: { shopId } });
    }
}
