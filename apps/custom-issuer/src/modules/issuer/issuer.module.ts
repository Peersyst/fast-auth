import { Module } from '@nestjs/common';
import { IssuerService } from './issuer.service';
import { IssuerController } from './issuer.controller';
import { KeyService } from './key.service';

@Module({
  providers: [IssuerService, KeyService],
  controllers: [IssuerController],
})
export class IssuerModule {}
