import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class IssueRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000, { message: 'JWT token is too long' })
  jwt!: string;
}
