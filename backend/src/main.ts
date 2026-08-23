import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import * as fs from 'fs';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production!');
    } else {
      logger.warn('[Security] JWT_SECRET is not set. Defaulting to fallback key for development.');
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.use(cookieParser());

  // Ensure uploads dir exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // Serve uploaded files statically at /uploads
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Security headers (enable CSP but allow cross-origin images/media if needed)
  app.use(helmet({ 
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        mediaSrc: ["'self'", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));

  // Global validation pipe — validates all incoming request bodies
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS — allow frontend origins
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow mobile apps, curl, and local web test origins (e.g. localhost:8081)
      if (!origin) return callback(null, true);
      if (
        !allowedOrigins.length ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization,Accept,X-Requested-With',
    exposedHeaders: 'Content-Length,Content-Range',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on port: ${port}`);
}
bootstrap();
