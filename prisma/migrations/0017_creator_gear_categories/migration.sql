-- ኤሌክትሮኒክስ ለኮንተንት ክሬሽን እቃዎች ብቻ፤ ከነዚህ ውጭ ያለው OTHER። ገና ምንም እቃ ስላልተለጠፈ ቀድሞ የነበሩት እሴቶች ወደ OTHER ይቀየራሉ።
ALTER TYPE "ProductCategory" RENAME TO "ProductCategory_old";
CREATE TYPE "ProductCategory" AS ENUM ('CAMERA', 'LENS', 'LIGHTING', 'MICROPHONE', 'AUDIO_INTERFACE', 'TRIPOD_GIMBAL', 'PHONE', 'LAPTOP', 'COMPUTER', 'TABLET', 'OTHER');
ALTER TABLE "product" ALTER COLUMN "category" TYPE "ProductCategory" USING (
  CASE "category"::text
    WHEN 'TV_AUDIO' THEN 'OTHER'
    WHEN 'GAMING' THEN 'OTHER'
    WHEN 'ACCESSORY' THEN 'OTHER'
    ELSE "category"::text
  END
)::"ProductCategory";
DROP TYPE "ProductCategory_old";
