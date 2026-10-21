/**
 * renderAdCanvas — كل منطق الرسم على Canvas للإعلان النهائي (1080×1920).
 * أُخرج من `AdGenerator` (931 سطراً) دون تغيير أي حساب أو فرع تصميمي.
 * الواجهة تستدعي `renderAd` فقط، وتتعامل مع النجاح/الفشل بـToast.
 */

import { AD_EXPORT_HEIGHT, AD_EXPORT_WIDTH, type AdTemplate } from './adTemplates';

export interface AdRenderOptions {
  canvas: HTMLCanvasElement;
  template: AdTemplate;
  productName: string;
  productPrice: number;
  productOriginalPrice: number | null;
  productImage: string;
  customDiscount: string;
  showPrice: boolean;
  showStoreName: boolean;
  storeName: string | null | undefined;
}

export async function renderAd({
  canvas,
  template,
  productName,
  productPrice,
  productOriginalPrice,
  productImage,
  customDiscount,
  showPrice,
  showStoreName,
  storeName,
}: AdRenderOptions): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context is not available');

  canvas.width = AD_EXPORT_WIDTH;
  canvas.height = AD_EXPORT_HEIGHT;

  const drawBackground = (): void => {
    ctx.fillStyle = template.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const drawDecorativePattern = (): void => {
    const tid = template.id;
    const width = canvas.width;
    const height = canvas.height;
    ctx.save();
    if (tid === 'elegant') {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(36, 36, width - 72, height - 72);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(54, 54, width - 108, height - 108);
      ctx.restore();
      return;
    }
    if (tid === 'luxury') {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,215,0,0.9)';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, width - 80, height - 80);
      ctx.strokeStyle = 'rgba(255,215,0,0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 60, width - 120, height - 120);
      const cx = width / 2;
      const cy = 60;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx + 12, cy);
      ctx.lineTo(cx, cy + 12);
      ctx.lineTo(cx - 12, cy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    if (tid === 'offer') {
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(80, 210, width - 160, 3);
      ctx.restore();
      return;
    }
    const spots =
      tid === 'discount'
        ? [
            { x: width * 0.08, y: height * 0.08, r: 170 }, { x: width * 0.92, y: height * 0.12, r: 130 },
            { x: width * 0.1, y: height * 0.9, r: 150 }, { x: width * 0.9, y: height * 0.92, r: 190 },
            { x: width * 0.5, y: height * 0.03, r: 90 },
          ]
        : tid === 'fresh'
          ? [{ x: width * 0.12, y: height * 0.08, r: 150 }, { x: width * 0.88, y: height * 0.1, r: 120 }]
          : [{ x: width * 0.1, y: height * 0.1, r: 200 }, { x: width * 0.9, y: height * 0.15, r: 150 }];
    ctx.globalAlpha = tid === 'discount' ? 0.12 : 0.08;
    spots.forEach(({ x, y, r }) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
    ctx.restore();
  };

  const drawProductImage = async (): Promise<number> => {
    return new Promise((resolve) => {
      const finish = (bottom: number): void => resolve(bottom);
      const tid = template.id;

      if (tid === 'offer' || tid === 'fresh') {
        const drawBleed = (img: HTMLImageElement): void => {
          const bh = tid === 'offer' ? canvas.height * 0.5 : canvas.height * 0.54;
          const iw = img.naturalWidth || img.width;
          const ih = img.naturalHeight || img.height;
          const scale = Math.max(canvas.width / iw, bh / ih);
          const dw = iw * scale;
          const dh = ih * scale;
          const dx = (canvas.width - dw) / 2;
          ctx.save();
          ctx.beginPath();
          if (tid === 'fresh') ctx.roundRect(0, 0, canvas.width, bh + 32, [0, 0, 32, 32]);
          else ctx.rect(0, 0, canvas.width, bh);
          ctx.clip();
          ctx.drawImage(img, dx, 0, dw, dh);
          ctx.restore();
          if (tid === 'fresh') {
            ctx.save();
            ctx.fillStyle = template.accentColor;
            ctx.beginPath();
            ctx.roundRect(60, bh - 20, canvas.width - 120, 120, 60);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 52px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${productPrice.toLocaleString('en-US')} ر.س`, canvas.width / 2, bh + 42);
            ctx.restore();
            finish(bh + 130);
            return;
          }
          finish(bh);
        };
        const first = new Image();
        first.crossOrigin = 'anonymous';
        first.onload = (): void => { drawBleed(first); };
        first.onerror = (): void => {
          const second = new Image();
          second.crossOrigin = 'anonymous';
          second.onload = (): void => { drawBleed(second); };
          second.onerror = (): void => finish(canvas.height * 0.5);
          second.src = `https://images.weserv.nl/?url=${encodeURIComponent(productImage)}&w=800`;
        };
        first.src = productImage;
        return;
      }

      const drawImage = (img: HTMLImageElement): void => {
        const geometry =
          tid === 'discount' ? { maxW: 0.86, maxH: 0.47, y: 0.12, frame: 34, radius: 28 }
          : tid === 'luxury' ? { maxW: 0.74, maxH: 0.4, y: 0.155, frame: 30, radius: 18 }
          : tid === 'elegant' ? { maxW: 0.64, maxH: 0.38, y: 0.15, frame: 18, radius: 12 }
          : { maxW: 0.76, maxH: 0.41, y: 0.16, frame: 22, radius: 28 };
        const maxWidth = canvas.width * geometry.maxW;
        const maxHeight = canvas.height * geometry.maxH;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
        const x = (canvas.width - width) / 2;
        const y = canvas.height * geometry.y;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = tid === 'elegant' ? 25 : 50;
        ctx.shadowOffsetY = 25;
        if (tid === 'luxury') ctx.fillStyle = '#ffd700';
        else if (tid === 'elegant') ctx.fillStyle = 'rgba(0,0,0,0.45)';
        else ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(x - geometry.frame, y - geometry.frame, width + geometry.frame * 2, height + geometry.frame * 2, geometry.radius);
        ctx.fill();
        ctx.restore();

        if (tid === 'luxury') {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,215,0,0.85)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(x - geometry.frame + 10, y - geometry.frame + 10, width + (geometry.frame - 10) * 2, height + (geometry.frame - 10) * 2, geometry.radius - 4);
          ctx.stroke();
          ctx.restore();
        }
        if (tid === 'elegant') {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x - geometry.frame + 6, y - geometry.frame + 6, width + (geometry.frame - 6) * 2, height + (geometry.frame - 6) * 2, geometry.radius - 2);
          ctx.stroke();
          ctx.restore();
        }
        if (tid === 'discount') {
          ctx.save();
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(x - geometry.frame + 9, y - geometry.frame + 9, width + (geometry.frame - 9) * 2, height + (geometry.frame - 9) * 2, geometry.radius - 3);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, Math.max(8, geometry.radius - 8));
        ctx.clip();
        ctx.drawImage(img, x, y, width, height);
        ctx.restore();

        if (tid === 'discount') {
          ctx.save();
          ctx.translate(x + width - 20, y + 44);
          ctx.rotate(-Math.PI / 7);
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 6;
          ctx.fillStyle = '#e11d48';
          ctx.beginPath();
          ctx.roundRect(-150, -42, 300, 84, 12);
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 44px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('تخفيض', 0, 4);
          ctx.restore();
        }
        finish(y + height + geometry.frame);
      };

      const first = new Image();
      first.crossOrigin = 'anonymous';
      first.onload = (): void => { drawImage(first); };
      first.onerror = (): void => {
        const second = new Image();
        second.crossOrigin = 'anonymous';
        second.onload = (): void => { drawImage(second); };
        second.onerror = (): void => {
          const x = (canvas.width - 400) / 2;
          const y = canvas.height * 0.25;
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.roundRect(x, y, 400, 300, 24);
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.arc(canvas.width / 2 - 80, y + 110, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(canvas.width / 2 - 130, y + 180, 260, 50);
          ctx.restore();
          finish(y + 300);
        };
        second.src = `https://images.weserv.nl/?url=${encodeURIComponent(productImage)}&w=800`;
      };
      first.src = productImage;
    });
  };

  const drawBadge = (): void => {
    const tid = template.id;
    const canvasWidth = canvas.width;
    const badgeText = customDiscount ? `${customDiscount}% خصم` : template.badge;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (tid === 'elegant') {
      const w = 240;
      const h = 64;
      const x = (canvasWidth - w) / 2;
      const y = 96;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 32);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '32px Arial, sans-serif';
      ctx.fillText(badgeText, canvasWidth / 2, y + h / 2);
      ctx.restore();
      return;
    }
    if (tid === 'luxury') {
      const w = 280;
      const h = 72;
      const x = (canvasWidth - w) / 2;
      const y = 96;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 36);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 36);
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.fillText(badgeText, canvasWidth / 2, y + h / 2);
      ctx.restore();
      return;
    }
    if (tid === 'new') {
      const w = 220;
      const h = 64;
      const x = 60;
      const y = 96;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 32);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = template.accentColor;
      ctx.font = 'bold 30px Arial, sans-serif';
      ctx.fillText(badgeText, x + w / 2, y + h / 2);
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    const badgeWidth = tid === 'discount' ? 300 : 260;
    const badgeHeight = tid === 'discount' ? 78 : 70;
    const badgeX = canvasWidth - badgeWidth - 50;
    const badgeY = 70;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 35);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = template.accentColor;
    ctx.font = `bold ${tid === 'discount' ? 34 : 32}px Arial, sans-serif`;
    ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    ctx.restore();
  };

  const drawTextArea = (imgBottom: number): void => {
    const tid = template.id;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const wrapName = (font: string, maxW: number): string[] => {
      ctx.font = font;
      const words = productName.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (ctx.measureText(next).width > maxW && current) {
          lines.push(current);
          current = word;
        } else {
          current = next;
        }
      }
      lines.push(current);
      return lines;
    };

    const drawRefPrice = (y: number, color = 'rgba(255,255,255,0.78)'): number => {
      if (productOriginalPrice == null) return y;
      const label = `قبل الخصم: ${productOriginalPrice.toLocaleString('en-US')} ر.س`;
      ctx.font = '34px Arial, sans-serif';
      const width = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillText(label, canvasWidth / 2, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(canvasWidth / 2 - width / 2 - 8, y);
      ctx.lineTo(canvasWidth / 2 + width / 2 + 8, y);
      ctx.stroke();
      return y + 52;
    };

    if (tid === 'offer') {
      const barHeight = 250;
      const barY = canvasHeight - barHeight;
      ctx.fillStyle = template.accentColor;
      ctx.fillRect(0, barY, canvasWidth, barHeight);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 58px Arial, sans-serif';
      const lines = wrapName('bold 58px Arial, sans-serif', canvasWidth * 0.85);
      const lineHeight = 74;
      const y = barY - 40 - (lines.length - 1) * lineHeight;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      lines.forEach((line, index) => ctx.fillText(line, canvasWidth / 2, y + index * lineHeight));
      ctx.shadowColor = 'transparent';
      if (productOriginalPrice != null) {
        ctx.font = '32px Arial, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        const label = `قبل الخصم: ${productOriginalPrice.toLocaleString('en-US')} ر.س`;
        const width = ctx.measureText(label).width;
        ctx.fillText(label, canvasWidth / 2, barY - 40 - lines.length * lineHeight + lineHeight - 60);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(canvasWidth / 2 - width / 2 - 6, barY - 40 - lines.length * lineHeight + lineHeight - 60);
        ctx.lineTo(canvasWidth / 2 + width / 2 + 6, barY - 40 - lines.length * lineHeight + lineHeight - 60);
        ctx.stroke();
      }
      if (showPrice) {
        ctx.font = 'bold 56px Arial, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${productPrice.toLocaleString('en-US')} ر.س`, canvasWidth / 2, barY + 78);
      }
      if (showStoreName && storeName) {
        ctx.font = '34px Arial, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(storeName, canvasWidth / 2, barY + 168);
      }
      ctx.restore();
      return;
    }

    const scrimTop = Math.min(Math.max(imgBottom + 24, canvasHeight * 0.45), canvasHeight - 700);
    const scrim = ctx.createLinearGradient(0, scrimTop, 0, canvasHeight);
    scrim.addColorStop(0, 'rgba(0,0,0,0)');
    scrim.addColorStop(0.35, 'rgba(0,0,0,0.6)');
    scrim.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, scrimTop, canvasWidth, canvasHeight - scrimTop);

    const nameFont =
      tid === 'luxury' ? 'bold 64px Arial, sans-serif'
      : tid === 'discount' ? 'bold 64px Arial, sans-serif'
      : tid === 'elegant' ? '52px Arial, sans-serif'
      : 'bold 58px Arial, sans-serif';
    const lines = wrapName(nameFont, canvasWidth * 0.85);
    const lineHeight = tid === 'elegant' ? 68 : 78;
    let y = scrimTop + 130;

    if (tid === 'elegant') {
      const ex = canvasWidth - 90;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      lines.forEach((line, index) => ctx.fillText(line, ex, y + index * lineHeight));
      ctx.shadowColor = 'transparent';
      y += lines.length * lineHeight + 30;
      if (showPrice) {
        const priceText = `${productPrice.toLocaleString('en-US')} ر.س`;
        ctx.font = '54px Arial, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(priceText, ex, y + 10);
        const priceWidth = ctx.measureText(priceText).width;
        if (productOriginalPrice != null) {
          ctx.font = '30px Arial, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          const label = `${productOriginalPrice.toLocaleString('en-US')} ر.س`;
          ctx.fillText(label, ex - priceWidth - 26, y + 10);
          const refWidth = ctx.measureText(label).width;
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(ex - priceWidth - 26 - refWidth, y + 10);
          ctx.lineTo(ex - priceWidth - 18, y + 10);
          ctx.stroke();
        }
        ctx.fillStyle = template.accentColor;
        ctx.fillRect(ex - 150, y + 52, 150, 4);
        y += 100;
      }
      if (showStoreName && storeName) {
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = '32px Arial, sans-serif';
        ctx.fillText(storeName, ex, Math.min(y + 10, canvasHeight - 96));
      }
      ctx.restore();
      return;
    }

    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    lines.forEach((line, index) => ctx.fillText(line, canvasWidth / 2, y + index * lineHeight));
    ctx.shadowColor = 'transparent';
    y += lines.length * lineHeight + 26;

    if (tid === 'luxury') {
      const dividerY = y - 8;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(canvasWidth / 2 - 130, dividerY);
      ctx.lineTo(canvasWidth / 2 - 22, dividerY);
      ctx.moveTo(canvasWidth / 2 + 22, dividerY);
      ctx.lineTo(canvasWidth / 2 + 130, dividerY);
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(canvasWidth / 2, dividerY - 10);
      ctx.lineTo(canvasWidth / 2 + 10, dividerY);
      ctx.lineTo(canvasWidth / 2, dividerY + 10);
      ctx.lineTo(canvasWidth / 2 - 10, dividerY);
      ctx.closePath();
      ctx.fill();
      y += 44;
    }

    if (tid !== 'discount') y = drawRefPrice(y);
    if (showPrice) {
      const priceText = `${productPrice.toLocaleString('en-US')} ر.س`;
      ctx.font = `bold ${tid === 'discount' ? 60 : 48}px Arial, sans-serif`;
      const pillWidth = ctx.measureText(priceText).width + 72;
      const pillHeight = tid === 'discount' ? 88 : 70;
      ctx.fillStyle = template.accentColor;
      ctx.beginPath();
      ctx.roundRect((canvasWidth - pillWidth) / 2, y - 12, pillWidth, pillHeight, 38);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(priceText, canvasWidth / 2, y + pillHeight / 2 - 8);
      y += pillHeight + 34;
    }
    if (tid === 'discount') y = drawRefPrice(y);
    if (showStoreName && storeName) {
      ctx.fillStyle = tid === 'luxury' ? 'rgba(255,215,0,0.9)' : 'rgba(255,255,255,0.8)';
      ctx.font = '34px Arial, sans-serif';
      ctx.fillText(storeName, canvasWidth / 2, Math.min(y + 10, canvasHeight - 96));
    }
    ctx.restore();
  };

  drawBackground();
  drawDecorativePattern();
  let imageBottom = canvas.height * 0.5;
  if (productImage) imageBottom = await drawProductImage();
  drawBadge();
  drawTextArea(imageBottom);

  const link = document.createElement('a');
  link.download = `${productName}-ad.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}
