/**
 * Local photo analysis — samples pixels in the browser (no API key required).
 */
(function () {
  function rgbToColorName(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 18) {
      if (max > 210) return 'white';
      if (max < 45) return 'black';
      return 'gray';
    }
    if (r > 200 && g > 120 && g < 200 && b > 120 && b < 220 && r > g) return 'pink';
    if (r > 160 && g < 100 && b < 100) return 'red';
    if (r > 160 && g > 100 && g < 170 && b < 80) return 'orange';
    if (r > 170 && g > 140 && b < 90) return 'gold';
    if (g > r * 1.12 && g > b * 1.05 && g > 90) return 'green';
    if (b > r * 1.05 && b > g && b > 90) return 'blue';
    if (r > 100 && g > 80 && b > 80 && r >= g && g >= b) return 'brown';
    if (b > 120 && r < 100 && g < 120) return 'navy';
    if (max > 180 && min > 140) return 'silver';
    if (r > 120 && b > 100 && r > g) return 'purple';
    if (r > 100 && g > 100 && b > 100) return 'gray';
    return 'unknown';
  }

  function capitalize(s) {
    return String(s || '').replace(/^\w/, (c) => c.toUpperCase());
  }

  function inferFromVisual(aspect, colors) {
    const primary = colors[0] || 'unknown';
    const colorLabel = colors.slice(0, 2).map(capitalize).join(', ') || 'Unknown';
    const tags = [...new Set([primary, ...colors.slice(1), 'campus', 'found-item'])].filter((t) => t && t !== 'unknown');

    if (aspect >= 1.12) {
      const isBottleColor = ['pink', 'red', 'blue', 'silver', 'white', 'black', 'purple', 'green', 'gold'].includes(primary);
      if (isBottleColor) {
        return {
          object_type: 'bottle',
          suggested_name: `${capitalize(primary)} Water Bottle`,
          suggested_category: 'Personal Items',
          suggested_colors: colorLabel,
          suggested_tags: ['bottle', 'tumbler', 'container', 'hydration', primary],
          material: ['silver', 'white'].includes(primary) ? 'Metal' : 'Plastic',
          description: `A ${primary} reusable bottle or tumbler with a tall cylindrical shape, photographed against a campus background.`,
        };
      }
      return {
        object_type: 'tall-item',
        suggested_name: `${capitalize(primary)} Item`,
        suggested_category: 'Personal Items',
        suggested_colors: colorLabel,
        suggested_tags: tags,
        material: 'Unknown',
        description: `A tall ${primary}-colored personal item. Please confirm the exact type before submitting.`,
      };
    }

    if (aspect <= 0.82 && ['black', 'brown', 'gray'].includes(primary)) {
      return {
        object_type: 'wallet',
        suggested_name: `${capitalize(primary)} Wallet`,
        suggested_category: 'Accessories',
        suggested_colors: colorLabel,
        suggested_tags: ['wallet', 'leather', 'accessory', primary],
        material: primary === 'brown' || primary === 'black' ? 'Leather' : 'Unknown',
        description: `A ${primary} wallet or small accessory with a foldable rectangular shape.`,
      };
    }

    if (aspect <= 0.95 && ['white', 'blue'].includes(primary)) {
      return {
        object_type: 'id-card',
        suggested_name: 'ID or Card',
        suggested_category: 'IDs/Documents',
        suggested_colors: colorLabel,
        suggested_tags: ['id', 'card', 'document', primary],
        material: 'Plastic',
        description: `A card-sized item, possibly a school ID or document holder. Verify before claiming.`,
      };
    }

    return {
      object_type: 'general',
      suggested_name: `${capitalize(primary)} Item`,
      suggested_category: primary === 'black' || primary === 'brown' ? 'Accessories' : 'General',
      suggested_colors: colorLabel,
      suggested_tags: tags,
      material: 'Unknown',
      description: `A ${primary}-colored campus item photographed on campus grounds.`,
    };
  }

  function analyzePhotoLocally(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 220;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const width = Math.max(1, Math.floor(img.width * scale));
        const height = Math.max(1, Math.floor(img.height * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, width, height);
        const pixels = ctx.getImageData(0, 0, width, height).data;

        const buckets = {};
        const cx = width * 0.28;
        const cy = height * 0.12;
        const cw = width * 0.44;
        const ch = height * 0.76;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            if (a < 128) continue;

            const isGrass = g > r * 1.12 && g > b * 1.08 && g > 75 && r < 170;
            const inObject = x >= cx && x <= cx + cw && y >= cy && y <= cy + ch;
            if (isGrass && !inObject) continue;

            const name = rgbToColorName(r, g, b);
            if (name === 'unknown') continue;
            const weight = inObject ? 3 : 1;
            buckets[name] = (buckets[name] || 0) + weight;
          }
        }

        const dominant = Object.entries(buckets)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([c]) => c);

        const aspect = height / width;
        const visual = inferFromVisual(aspect, dominant.length ? dominant : ['unknown']);

        resolve({
          dominant_colors: dominant,
          aspect_ratio: Math.round(aspect * 100) / 100,
          width: img.width,
          height: img.height,
          ...visual,
        });
      };
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = dataUrl;
    });
  }

  window.analyzePhotoLocally = analyzePhotoLocally;
})();
