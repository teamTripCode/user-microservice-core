import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({
        description: 'User email address',
        example: 'user@example.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'User password',
        example: 'securePassword123',
        minLength: 6,
    })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiPropertyOptional({
        description: 'User full name',
        example: 'John Doe',
    })
    @IsString()
    @IsOptional()
    name?: string;
}