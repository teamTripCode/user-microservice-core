import { Controller, Get, Post, Body, Patch, Param, Request, Query } from '@nestjs/common';
import { KyxService } from './kyx.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateKycKybDto, UpdateKycKybDto } from './dto/kyc-kyb.dto';
import { KycStatus } from '@prisma/client';

@Controller('kyx')
export class KyxController {
  constructor(private readonly kycKybService: KyxService) {}

  @Post()
  @ApiOperation({ summary: 'Create KYC/KYB for current user' })
  @ApiResponse({ status: 201, description: 'KYC/KYB created successfully' })
  async createKycKyb(@Request() req, @Body() createKycKybDto: CreateKycKybDto) {
    return this.kycKybService.createKycKyb(req.user.sub, createKycKybDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all KYC/KYB records (admin only)' })
  @ApiResponse({ status: 200, description: 'KYC/KYB records retrieved' })
  async getAllKycKyb(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: KycStatus,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    return this.kycKybService.getAllKycKyb(pageNum, limitNum, status);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user KYC/KYB' })
  @ApiResponse({ status: 200, description: 'KYC/KYB retrieved' })
  async getMyKycKyb(@Request() req) {
    return this.kycKybService.getKycKybByUserId(req.user.sub);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get KYC/KYB by user ID' })
  @ApiResponse({ status: 200, description: 'KYC/KYB found' })
  async getKycKybByUserId(@Param('userId') userId: string) {
    return this.kycKybService.getKycKybByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get KYC/KYB by ID' })
  @ApiResponse({ status: 200, description: 'KYC/KYB found' })
  async getKycKybById(@Param('id') id: string) {
    return this.kycKybService.getKycKybById(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user KYC/KYB' })
  @ApiResponse({ status: 200, description: 'KYC/KYB updated successfully' })
  async updateMyKycKyb(@Request() req, @Body() updateKycKybDto: UpdateKycKybDto) {
    return this.kycKybService.updateKycKyb(req.user.sub, updateKycKybDto);
  }
}
