import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ReorderItem {
  @IsString() id: string;
  @IsNumber() order: number;
}

export class ReorderQuestionsDto {
  @ApiProperty({ type: [ReorderItem] }) @IsArray() @ValidateNested({ each: true }) @Type(() => ReorderItem)
  questions: ReorderItem[];
}
