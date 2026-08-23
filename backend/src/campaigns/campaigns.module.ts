import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignProcessor } from './campaign.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ConsentModule } from '../consent/consent.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'campaigns',
    }),
    forwardRef(() => WhatsappModule),
    ConsentModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignProcessor],
  exports: [CampaignsService],
})
export class CampaignsModule { }
