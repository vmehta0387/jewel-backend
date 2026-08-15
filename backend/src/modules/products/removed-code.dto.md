
// export class UpdateStonePacketDto {
//   @IsString()
//   @IsOptional()
//   barcode?: string;

//   @IsString()
//   @IsOptional()
//   packetName?: string;

//   @IsString()
//   @IsOptional()
//   stockType?: string;

//   @IsString()
//   @IsOptional()
//   stone?: string;

//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   @IsOptional()
//   stoneId?: number;

//   @IsString()
//   @IsOptional()
//   shape?: string;

//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   @IsOptional()
//   shapeId?: number;

//   @IsString()
//   @IsOptional()
//   size?: string;

//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   @IsOptional()
//   sizeId?: number;

//   @IsString()
//   @IsOptional()
//   cut?: string;

//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   @IsOptional()
//   cutId?: number;

//   @IsString()
//   @IsOptional()
//   color?: string;

//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   @IsOptional()
//   colorId?: number;

//   @IsString()
//   @IsOptional()
//   quality?: string;

//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   @IsOptional()
//   qualityId?: number;

//   @IsIn(['WT', 'PCS'])
//   @IsOptional()
//   priceIn?: 'WT' | 'PCS';

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   sellingPrice?: number;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0.000001)
//   @IsOptional()
//   weightPerPc?: number;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   pieces?: number;

//   @Type(() => Number)
//   @IsNumber()
//   @Min(0.000001)
//   @IsOptional()
//   weight?: number;

//   @IsIn(['CTS', 'GMS'])
//   @IsOptional()
//   weightUnit?: 'CTS' | 'GMS';
// }

// export class UpdateStonePacketStatusDto {
//   @Type(() => Boolean)
//   @IsBoolean()
//   isActive: boolean;
// }