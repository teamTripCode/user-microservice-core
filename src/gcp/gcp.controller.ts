import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request,
  Query 
} from '@nestjs/common';
import { GcpService } from './gcp.service';
import { CreateGcpKeyDto, UpdateGcpKeyDto } from 'src/user/interfaces/gcp-key.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('gcp-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gcp')
export class GcpController {
  constructor(private readonly gcpService: GcpService) {}

  @Post()
  @ApiOperation({ summary: 'Create GCP key for current user' })
  @ApiResponse({ status: 201, description: 'GCP key created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createGcpKey(@Request() req, @Body() createGcpKeyDto: CreateGcpKeyDto) {
    return this.gcpService.createGcpKey(req.user.sub, createGcpKeyDto);
  }

  @Post('user/:userId')
  @ApiOperation({ summary: 'Create GCP key for specific user (admin only)' })
  @ApiResponse({ status: 201, description: 'GCP key created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createGcpKeyForUser(
    @Param('userId') userId: string,
    @Body() createGcpKeyDto: CreateGcpKeyDto
  ) {
    return this.gcpService.createGcpKey(userId, createGcpKeyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all GCP keys (admin only)' })
  @ApiResponse({ status: 200, description: 'GCP keys retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status', type: Boolean })
  async getAllGcpKeys(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('isActive') isActive?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const isActiveBoolean = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    
    return this.gcpService.getAllGcpKeys(pageNum, limitNum, isActiveBoolean);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user GCP keys' })
  @ApiResponse({ status: 200, description: 'GCP keys retrieved successfully' })
  async getMyGcpKeys(@Request() req) {
    return this.gcpService.getGcpKeysByUserId(req.user.sub);
  }

  @Get('me/active')
  @ApiOperation({ summary: 'Get current user active GCP keys' })
  @ApiResponse({ status: 200, description: 'Active GCP keys retrieved successfully' })
  async getMyActiveGcpKeys(@Request() req) {
    return this.gcpService.getActiveGcpKeysByUserId(req.user.sub);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get GCP keys by user ID (admin only)' })
  @ApiResponse({ status: 200, description: 'GCP keys retrieved successfully' })
  async getGcpKeysByUserId(@Param('userId') userId: string) {
    return this.gcpService.getGcpKeysByUserId(userId);
  }

  @Get('user/:userId/active')
  @ApiOperation({ summary: 'Get active GCP keys by user ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Active GCP keys retrieved successfully' })
  async getActiveGcpKeysByUserId(@Param('userId') userId: string) {
    return this.gcpService.getActiveGcpKeysByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get GCP key by ID' })
  @ApiResponse({ status: 200, description: 'GCP key found successfully' })
  @ApiResponse({ status: 404, description: 'GCP key not found' })
  async getGcpKeyById(@Param('id') id: string) {
    return this.gcpService.getGcpKeyById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update GCP key' })
  @ApiResponse({ status: 200, description: 'GCP key updated successfully' })
  @ApiResponse({ status: 404, description: 'GCP key not found' })
  async updateGcpKey(
    @Param('id') id: string,
    @Body() updateGcpKeyDto: UpdateGcpKeyDto
  ) {
    return this.gcpService.updateGcpKey(id, updateGcpKeyDto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate GCP key' })
  @ApiResponse({ status: 200, description: 'GCP key activated successfully' })
  @ApiResponse({ status: 404, description: 'GCP key not found' })
  async activateGcpKey(@Param('id') id: string) {
    return this.gcpService.activateGcpKey(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate GCP key' })
  @ApiResponse({ status: 200, description: 'GCP key deactivated successfully' })
  @ApiResponse({ status: 404, description: 'GCP key not found' })
  async deactivateGcpKey(@Param('id') id: string) {
    return this.gcpService.deactivateGcpKey(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete GCP key' })
  @ApiResponse({ status: 200, description: 'GCP key deleted successfully' })
  @ApiResponse({ status: 404, description: 'GCP key not found' })
  async deleteGcpKey(@Param('id') id: string) {
    await this.gcpService.deleteGcpKey(id);
    return { message: 'GCP key deleted successfully' };
  }
}