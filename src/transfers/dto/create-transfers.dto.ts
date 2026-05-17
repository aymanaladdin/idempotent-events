import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferEventDto {
  @ApiProperty({ example: 'evt-001' })
  @IsString()
  @IsNotEmpty()
  event_id: string;

  @ApiProperty({ example: 'station-42' })
  @IsString()
  @IsNotEmpty()
  station_id: string;

  @ApiProperty({ example: 100.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'approved' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: '2026-02-19T10:00:00Z' })
  @IsDateString()
  created_at: string;
}

export class CreateTransfersDto {
  @ApiProperty({ type: [TransferEventDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferEventDto)
  events: TransferEventDto[];
}
