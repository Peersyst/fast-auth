import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { IssuerService } from './issuer.service';
import { IssueRequestDto } from './dto/issue-request.dto';

@Controller('issuer')
export class IssuerController {
  constructor(private readonly issuerService: IssuerService) {}

  @Post('issue')
  @HttpCode(HttpStatus.OK)
  async issue(@Body() body: IssueRequestDto): Promise<{ token: string }> {
    const token = await this.issuerService.issueToken(body.jwt);
    return { token };
  }
}
