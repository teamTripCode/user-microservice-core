import { Injectable, NotFoundException } from '@nestjs/common';
import { GcpKey } from '@prisma/client';
import { CreateGcpKeyDto, UpdateGcpKeyDto } from 'src/user/interfaces/gcp-key.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GcpService {
  constructor(private readonly prisma: PrismaService) { }

  async createGcpKey(userId: string, createGcpKeyDto: CreateGcpKeyDto): Promise<GcpKey> {
    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.gcpKey.create({
      data: {
        ...createGcpKeyDto,
        userId,
        expiresAt: createGcpKeyDto.expiresAt ? new Date(createGcpKeyDto.expiresAt) : null,
      },
    });
  }

  async getGcpKeysByUserId(userId: string): Promise<GcpKey[]> {
    return this.prisma.gcpKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGcpKeyById(id: string): Promise<GcpKey> {
    const gcpKey = await this.prisma.gcpKey.findUnique({
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

    if (!gcpKey) {
      throw new NotFoundException('GCP Key not found');
    }

    return gcpKey;
  }

  async updateGcpKey(id: string, updateGcpKeyDto: UpdateGcpKeyDto): Promise<GcpKey> {
    try {
      const updateData = {
        ...updateGcpKeyDto,
        expiresAt: updateGcpKeyDto.expiresAt ? new Date(updateGcpKeyDto.expiresAt) : undefined,
      };

      return await this.prisma.gcpKey.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('GCP Key not found');
      }
      throw error;
    }
  }

  async deleteGcpKey(id: string): Promise<void> {
    try {
      await this.prisma.gcpKey.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('GCP Key not found');
      }
      throw error;
    }
  }

  async deactivateGcpKey(id: string): Promise<GcpKey> {
    return this.updateGcpKey(id, { isActive: false });
  }

  async activateGcpKey(id: string): Promise<GcpKey> {
    return this.updateGcpKey(id, { isActive: true });
  }

  async getActiveGcpKeysByUserId(userId: string): Promise<GcpKey[]> {
    return this.prisma.gcpKey.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllGcpKeys(
    page: number = 1,
    limit: number = 10,
    isActive?: boolean,
  ): Promise<{ data: GcpKey[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const where = isActive !== undefined ? { isActive } : {};

    const [data, total] = await Promise.all([
      this.prisma.gcpKey.findMany({
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
      this.prisma.gcpKey.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
