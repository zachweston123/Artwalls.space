// Image compression utility for profile photos
// Compresses images before upload to reduce file size while maintaining quality

export async function compressImage(
  file: File,
  maxWidth: number = 500,
  maxHeight: number = 500,
  quality: number = 0.8,
  maxFileSizeBytes: number = 10 * 1024 * 1024
): Promise<{ file: File; sizeReduction: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const img = new Image();
        img.onload = () => {
          let currentQuality = quality;
          let bestFile: File | null = null;
          let bestSize = file.size;
          let attemptCount = 0;
          
          const attemptCompress = () => {
            // Create canvas for resizing
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Calculate new dimensions (maintain aspect ratio)
            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');
            
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to blob with compression
            canvas.toBlob(
              (blob) => {
                if (!blob) throw new Error('Failed to compress image');
                
                // Create new File from blob
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                
                // Track best compression
                if (compressedFile.size < bestSize) {
                  bestSize = compressedFile.size;
                  bestFile = compressedFile;
                }
                
                // If file is still too large and we can reduce quality further
                if (compressedFile.size > maxFileSizeBytes && currentQuality > 0.3) {
                  currentQuality = Math.max(0.3, currentQuality - 0.15);
                  attemptCount++;
                  if (attemptCount < 4) {
                    attemptCompress();
                    return;
                  }
                }
                
                // Return the best result
                const finalFile = bestFile || compressedFile;
                const sizeReduction = file.size - finalFile.size;
                
                resolve({ file: finalFile, sizeReduction });
              },
              'image/jpeg',
              currentQuality
            );
          };
          
          attemptCompress();
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Helper to format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Get compression info
export function getCompressionInfo(original: number, compressed: number): {
  reduction: number;
  percent: number;
} {
  const reduction = original - compressed;
  const percent = Math.round((reduction / original) * 100);
  return { reduction, percent };
}
