import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let jwtService: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      demoRequest: {
        create: jest.fn(),
      },
      shop: {
        create: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock_jwt_token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException if username case does not match DB strictly', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123', 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'admin',
        passwordHash,
        role: 'admin',
        shop: null,
      });

      // Attempt login with 'Admin' instead of 'admin'
      await expect(
        service.login({ username: 'Admin', password: 'CorrectPassword123' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password case is incorrect', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123', 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'admin',
        passwordHash,
        role: 'admin',
        shop: null,
      });

      // Attempt login with lowercased password
      await expect(
        service.login({ username: 'admin', password: 'correctpassword123' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should successfully log in and normalize role when credentials match exactly', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123', 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'admin',
        passwordHash,
        role: 'ADMIN',
        shop: null,
      });

      const result = await service.login({
        username: 'admin',
        password: 'CorrectPassword123',
      });

      expect(result.access_token).toBe('mock_jwt_token');
      expect(result.user.username).toBe('admin');
      expect(result.user.role).toBe('admin');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          username: 'admin',
          role: 'admin',
        })
      );
    });
  });
});
