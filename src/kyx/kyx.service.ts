import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateKycKybDto, UpdateKycKybDto } from './dto/kyc-kyb.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { KycKyb, KycStatus } from '@prisma/client';

@Injectable()
export class KyxService {
  constructor(private readonly prisma: PrismaService) { }

  async createKycKyb(userId: string, createKycKybDto: CreateKycKybDto): Promise<KycKyb> {
    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verificar si ya existe un KYC/KYB para este usuario
    const existingKyc = await this.prisma.kycKyb.findUnique({
      where: { userId },
    });

    if (existingKyc) {
      throw new ConflictException('KYC/KYB already exists for this user');
    }

    return this.prisma.kycKyb.create({
      data: {
        ...createKycKybDto,
        userId,
      },
    });
  }

  async getKycKybByUserId(userId: string): Promise<KycKyb> {
    const kycKyb = await this.prisma.kycKyb.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!kycKyb) {
      throw new NotFoundException('KYC/KYB not found');
    }

    return kycKyb;
  }

  async updateKycKyb(userId: string, updateKycKybDto: UpdateKycKybDto): Promise<KycKyb> {
    try {
      return await this.prisma.kycKyb.update({
        where: { userId },
        data: updateKycKybDto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('KYC/KYB not found');
      }
      throw error;
    }
  }

  async deleteKycKyb(userId: string): Promise<void> {
    try {
      await this.prisma.kycKyb.delete({
        where: { userId },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('KYC/KYB not found');
      }
      throw error;
    }
  }

  async getAllKycKyb(
    page: number = 1,
    limit: number = 10,
    status?: KycStatus,
  ): Promise<{ data: KycKyb[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.kycKyb.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.kycKyb.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getKycKybById(id: string): Promise<KycKyb> {
    const kycKyb = await this.prisma.kycKyb.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!kycKyb) {
      throw new NotFoundException('KYC/KYB not found');
    }

    return kycKyb;
  }
}
