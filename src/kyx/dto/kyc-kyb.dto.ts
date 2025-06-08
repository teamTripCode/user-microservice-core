import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { KycType, KycStatus } from '@prisma/client';

export class CreateKycKybDto {
    @ApiProperty({ enum: KycType })
    @IsEnum(KycType)
    type: KycType;

    @ApiPropertyOptional({ example: 'PASSPORT' })
    @IsOptional()
    @IsString()
    documentType?: string;

    @ApiPropertyOptional({ example: 'A1234567' })
    @IsOptional()
    @IsString()
    documentNumber?: string;

    @ApiPropertyOptional({ example: 'https://storage.googleapis.com/doc.pdf' })
    @IsOptional()
    @IsString()
    documentUrl?: string;

    @ApiPropertyOptional({ example: 'https://storage.googleapis.com/address.pdf' })
    @IsOptional()
    @IsString()
    addressProof?: string;

    @ApiPropertyOptional({ example: 'Acme Corp' })
    @IsOptional()
    @IsString()
    businessName?: string;

    @ApiPropertyOptional({ example: 'LLC' })
    @IsOptional()
    @IsString()
    businessType?: string;

    @ApiPropertyOptional({ example: '123 Business St' })
    @IsOptional()
    @IsString()
    businessAddress?: string;

    @ApiPropertyOptional({ example: '12-3456789' })
    @IsOptional()
    @IsString()
    taxId?: string;

    @ApiPropertyOptional({ example: 'Additional notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateKycKybDto {
    @ApiPropertyOptional({ enum: KycStatus })
    @IsOptional()
    @IsEnum(KycStatus)
    status?: KycStatus;

    @ApiPropertyOptional({ example: '2024-12-31' })
    @IsOptional()
    @IsDateString()
    verificationDate?: string;

    @ApiPropertyOptional({ example: 'Document not clear' })
    @IsOptional()
    @IsString()
    rejectionReason?: string;

    @ApiPropertyOptional({ example: 'Updated notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}