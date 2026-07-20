const fs = require('fs');
const zlib = require('zlib');

function getPngFirstPixel(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  // Verify PNG signature
  if (buffer.readUInt32BE(0) !== 0x89504E47 || buffer.readUInt32BE(4) !== 0x0D0A1A0A) {
    throw new Error('Not a valid PNG file');
  }
  
  let offset = 8;
  let ihdr = null;
  let idatBuffers = [];
  
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    
    if (type === 'IHDR') {
      ihdr = {
        width: buffer.readUInt32BE(offset + 8),
        height: buffer.readUInt32BE(offset + 12),
        bitDepth: buffer[offset + 16],
        colorType: buffer[offset + 17]
      };
    } else if (type === 'IDAT') {
      idatBuffers.push(buffer.subarray(offset + 8, offset + 8 + length));
    } else if (type === 'IEND') {
      break;
    }
    
    offset += 12 + length;
  }
  
  if (!ihdr) throw new Error('No IHDR chunk found');
  
  const idatCombined = Buffer.concat(idatBuffers);
  const decompressed = zlib.inflateSync(idatCombined);
  
  // Check first pixel based on colorType
  // ColorType 2 = RGB (3 bytes/pixel), 6 = RGBA (4 bytes/pixel)
  const filterType = decompressed[0];
  let r, g, b;
  if (ihdr.colorType === 2) {
    r = decompressed[1];
    g = decompressed[2];
    b = decompressed[3];
  } else if (ihdr.colorType === 6) {
    r = decompressed[1];
    g = decompressed[2];
    b = decompressed[3];
  } else {
    throw new Error('Unsupported color type: ' + ihdr.colorType);
  }
  
  const toHex = (val) => val.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

try {
  const color = getPngFirstPixel('C:\\Users\\Jagmeet\\.gemini\\antigravity\\brain\\650df401-7519-49ee-85dd-84e7e8020fe7\\media__1784542556381.png');
  console.log('DETECTED_COLOR:', color);
} catch (err) {
  console.error(err);
}
