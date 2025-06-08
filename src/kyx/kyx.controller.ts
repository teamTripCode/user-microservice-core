import { Controller, Get, Post, Body, Patch, Param, Delete, Request, Query, UseGuards } from '@nestjs/common';
import { KyxService } from './kyx.service';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreateKycKybDto, UpdateKycKybDto } from './dto/kyc-kyb.dto';
import { KycStatus } from '@prisma/client';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('kyx')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kyx')
export class KyxController {
  constructor(private readonly kycKybService: KyxService) {}

  @Post()
  @ApiOperation({ summary: 'Create KYC/KYB for current user' })
  @ApiResponse({ status: 201, description: 'KYC/KYB created successfully' })
  @ApiResponse({ status: 409, description: 'KYC/KYB already exists for this user' })
  async createKycKyb(@Request() req, @Body() createKycKybDto: CreateKycKybDto) {
    return this.kycKybService.createKycKyb(req.user.sub, createKycKybDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all KYC/KYB records (admin only)' })
  @ApiResponse({ status: 200, description: 'KYC/KYB records retrieved' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: KycStatus, description: 'Filter by status' })
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
  @ApiResponse({ status: 404, description: 'KYC/KYB not found' })
  async getMyKycKyb(@Request() req) {
    return this.kycKybService.getKycKybByUserId(req.user.sub);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get KYC/KYB by user ID (admin only)' })
  @ApiResponse({ status: 200, description: 'KYC/KYB found' })
  @ApiResponse({ status: 404, description: 'KYC/KYB not found' })
  async getKycKybByUserId(@Param('userId') userId: string) {
    return this.kycKybService.getKycKybByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get KYC/KYB by ID' })
  @ApiResponse({ status: 200, description: 'KYC/KYB found' })
  @ApiResponse({ status: 404, description: 'KYC/KYB not found' })
  async getKycKybById(@Param('id') id: string) {
    return this.kycKybService.getKycKybById(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user KYC/KYB' })
  @ApiResponse({ status: 200, description: 'KYC/KYB updated successfully' })
  @ApiResponse({ status: 404, description: 'KYC/KYB not found' })
  async updateMyKycKyb(@Request() req, @Body() updateKycKybDto: UpdateKycKybDto) {
    return this.kycKybService.updateKycKyb(req.user.sub, updateKycKybDto);
  }

  @Patch('user/:userId')
  @ApiOperation({ summary: 'Update KYC/KYB by user ID (admin only)' })
  @ApiResponse({ status: 200, description: 'KYC/KYB updated successfully' })
  @ApiResponse({ status: 404, description: 'KYC/KYB not found' })
  async updateKycKybByUserId(
    @Param('userId') userId: string, 
    @Body() updateKycKybDto: UpdateKycKybDto
  ) {
    return this.kycKybService.updateKycKyb(userId, updateKycKybDto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete current user KYC/KYB' })
  @ApiResponse({ status: 200, description: 'KYC/KYB deleted successfully' })
  @ApiResponse({ status: 404, description: 'KYC/KYB not found' })
  async deleteMyKycKyb(@Request() req) {
    await this.kycKybService.deleteKycKyb(req.user.sub);
    return { message: 'KYC/KYB deleted successfully' };
  }

  @Delete('user/:userId')
  @ApiOperation({ summary: 'Delete KYC/KYB by user ID (admin only)' })
  @ApiResponse({ status: 200, description: 'KYC/KYB deleted successfully' })
  @ApiResponse({ status: 404, description: 'KYC/KYB not found' })
  async deleteKycKybByUserId(@Param('userId') userId: string) {
    await this.kycKybService.deleteKycKyb(userId);
    return { message: 'KYC/KYB deleted successfully' };
  }
}