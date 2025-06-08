import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty()
  sub: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  roles: string[];

  @ApiProperty()
  permissions: string[];
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty()
  expiresAt: number;
}

export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresAt: number;
}

export class ValidationResponseDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}

export class ErrorResponseDto {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiProperty()
  error: string;
}