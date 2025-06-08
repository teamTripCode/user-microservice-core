import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { GcpKeyType } from '@prisma/client';

export class CreateGcpKeyDto {
    @ApiProperty({ example: 'my-service-account-key' })
    @IsString()
    keyName: string;

    @ApiProperty({ enum: GcpKeyType })
    @IsEnum(GcpKeyType)
    keyType: GcpKeyType;

    @ApiProperty({ example: '{"type": "service_account", "project_id": "my-project"}' })
    @IsString()
    keyData: string;

    @ApiPropertyOptional({ example: 'my-service-account@project.iam.gserviceaccount.com' })
    @IsOptional()
    @IsString()
    serviceAccount?: string;

    @ApiProperty({ example: 'my-gcp-project' })
    @IsString()
    projectId: string;

    @ApiPropertyOptional({ example: '2025-12-31' })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}

export class UpdateGcpKeyDto {
    @ApiPropertyOptional({ example: 'updated-key-name' })
    @IsOptional()
    @IsString()
    keyName?: string;

    @ApiPropertyOptional({ example: '{"updated": "data"}' })
    @IsOptional()
    @IsString()
    keyData?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: '2025-12-31' })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}