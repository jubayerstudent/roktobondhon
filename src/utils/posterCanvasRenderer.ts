import { OFFICIAL_LOGO_PATH } from '../components/BrandLogo';

export interface StudioBannerOptions {
  prompt: string;
  editInstruction?: string;
  upazilaLabel: string;
  imageSize: '1K' | '2K' | '4K';
  aspectRatio: '16:9' | '1:1' | '4:3';
  sourceImageDataUrl?: string | null;
  lang: 'bn' | 'en';
}

function getDimensions(
  imageSize: '1K' | '2K' | '4K',
  aspectRatio: '16:9' | '1:1' | '4:3'
): { width: number; height: number } {
  const baseWidthMap: Record<'1K' | '2K' | '4K', number> = {
    '1K': 1600,
    '2K': 2400,
    '4K': 3200,
  };
  const baseW = baseWidthMap[imageSize] || 1600;

  if (aspectRatio === '1:1') {
    return { width: baseW, height: baseW };
  }
  if (aspectRatio === '4:3') {
    return { width: baseW, height: Math.round((baseW * 3) / 4) };
  }
  return { width: baseW, height: Math.round((baseW * 9) / 16) };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.slice(0, 3);
}

/**
 * Generates or edits a high-resolution (1K / 2K / 4K) RoktoBondhon Campaign Banner
 * on an HTML5 Canvas so the user always gets a crisp, downloadable poster.
 */
export async function renderHighResCampaignBanner(
  options: StudioBannerOptions
): Promise<string> {
  const {
    prompt,
    editInstruction,
    upazilaLabel,
    imageSize,
    aspectRatio,
    sourceImageDataUrl,
    lang,
  } = options;

  const { width, height } = getDimensions(imageSize, aspectRatio);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const scale = width / 1600;
  const isEdited = Boolean(editInstruction && editInstruction.trim());

  // 1. Background Canvas
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (isEdited) {
    bgGrad.addColorStop(0, '#FFFDF9');
    bgGrad.addColorStop(0.55, '#FFF5F5');
    bgGrad.addColorStop(1, '#FECACA');
  } else {
    bgGrad.addColorStop(0, '#FFFFFF');
    bgGrad.addColorStop(0.55, '#FFF5F5');
    bgGrad.addColorStop(1, '#FEE2E2');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Top Red Healthcare Accent Ribbon
  const topGrad = ctx.createLinearGradient(0, 0, width, 0);
  topGrad.addColorStop(0, '#E53935');
  topGrad.addColorStop(1, '#B71C1C');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, Math.round(22 * scale));

  // Decorative right-side medical geometry
  ctx.save();
  ctx.beginPath();
  ctx.arc(width * 0.9, height * 0.48, height * 0.46, 0, Math.PI * 2);
  ctx.fillStyle = isEdited
    ? 'rgba(245, 158, 11, 0.08)'
    : 'rgba(229, 57, 53, 0.07)';
  ctx.fill();
  ctx.restore();

  // If user uploaded a custom reference photo, render it in a clean framed card on the right
  if (sourceImageDataUrl) {
    const srcImg = await loadImage(sourceImageDataUrl);
    if (srcImg) {
      const thumbW = Math.round(360 * scale);
      const thumbH = Math.round(240 * scale);
      const thumbX = width - thumbW - Math.round(80 * scale);
      const thumbY = Math.round(70 * scale);
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = Math.round(3 * scale);
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbW, thumbH, Math.round(18 * scale));
      ctx.fill();
      ctx.stroke();
      ctx.clip();
      ctx.drawImage(srcImg, thumbX, thumbY, thumbW, thumbH);
      ctx.restore();
    }
  }

  // 3. Draw Official Uploaded Logo Card in Top-Left
  const logoBoxSize = Math.round(168 * scale);
  const padX = Math.round(80 * scale);
  const padY = Math.round(64 * scale);

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FECACA';
  ctx.lineWidth = Math.max(2, Math.round(2 * scale));
  ctx.beginPath();
  ctx.roundRect(padX, padY, logoBoxSize, logoBoxSize, Math.round(24 * scale));
  ctx.fill();
  ctx.stroke();

  const logoImg = await loadImage(OFFICIAL_LOGO_PATH);
  if (logoImg) {
    const innerPad = Math.round(16 * scale);
    ctx.drawImage(
      logoImg,
      padX + innerPad,
      padY + innerPad,
      logoBoxSize - innerPad * 2,
      logoBoxSize - innerPad * 2
    );
  }

  // 4. Brand Header Text next to Logo
  const brandTextX = padX + logoBoxSize + Math.round(32 * scale);
  ctx.fillStyle = '#E53935';
  ctx.font = `700 ${Math.round(50 * scale)}px "Hind Siliguri", "Inter", sans-serif`;
  ctx.fillText('রক্তবন্ধন · RoktoBondhon', brandTextX, padY + Math.round(64 * scale));

  ctx.fillStyle = '#B71C1C';
  ctx.font = `600 ${Math.round(27 * scale)}px "Hind Siliguri", "Inter", sans-serif`;
  ctx.fillText(
    'এক ব্যাগ রক্ত, বাঁচাতে পারে একটি প্রাণ।',
    brandTextX,
    padY + Math.round(110 * scale)
  );

  ctx.fillStyle = '#475569';
  ctx.font = `600 ${Math.round(22 * scale)}px "Hind Siliguri", "Inter", sans-serif`;
  ctx.fillText(
    `${upazilaLabel} · ${
      lang === 'bn'
        ? 'স্বেচ্ছাসেবী রক্তদান ও সচেতনতা ক্যাম্পেইন'
        : 'Voluntary Blood Donation & Awareness Campaign'
    } · ${imageSize} (${width}×${height})`,
    brandTextX,
    padY + Math.round(148 * scale)
  );

  // 5. Main Campaign Title & Prompt Content
  const contentTopY = padY + logoBoxSize + Math.round(68 * scale);
  ctx.fillStyle = '#1E293B';
  ctx.font = `700 ${Math.round(48 * scale)}px "Hind Siliguri", "Inter", sans-serif`;

  const headline =
    lang === 'bn'
      ? `${upazilaLabel} স্বেচ্ছাসেবী রক্তদান ও ফ্রি ব্লাড গ্রুপিং ক্যাম্পেইন`
      : `${upazilaLabel} Voluntary Blood Donation & Free Grouping Drive`;
  const headlineLines = wrapText(ctx, headline, width - padX * 2);
  let cursorY = contentTopY;
  for (const line of headlineLines) {
    ctx.fillText(line, padX, cursorY);
    cursorY += Math.round(60 * scale);
  }

  // User Prompt
  cursorY += Math.round(12 * scale);
  ctx.fillStyle = '#334155';
  ctx.font = `500 ${Math.round(29 * scale)}px "Hind Siliguri", "Inter", sans-serif`;
  const promptLines = wrapText(ctx, prompt, width - padX * 2.1);
  for (const line of promptLines) {
    ctx.fillText(line, padX, cursorY);
    cursorY += Math.round(42 * scale);
  }

  // If edited, render a clean highlighted banner callout bar
  if (isEdited && editInstruction) {
    cursorY += Math.round(14 * scale);
    const boxH = Math.round(64 * scale);
    ctx.fillStyle = '#FEF2F2';
    ctx.strokeStyle = '#E53935';
    ctx.lineWidth = Math.max(2, Math.round(2 * scale));
    ctx.beginPath();
    ctx.roundRect(
      padX,
      cursorY - Math.round(38 * scale),
      width - padX * 2,
      boxH,
      Math.round(14 * scale)
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#B71C1C';
    ctx.font = `700 ${Math.round(25 * scale)}px "Hind Siliguri", "Inter", sans-serif`;
    ctx.fillText(
      editInstruction.slice(0, 95),
      padX + Math.round(24 * scale),
      cursorY + Math.round(2 * scale)
    );
  }

  // 6. Blood Groups Row
  const groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const badgeY = height - Math.round(195 * scale);
  const badgeW = Math.round(96 * scale);
  const badgeH = Math.round(54 * scale);
  const badgeGap = Math.round(18 * scale);

  groups.forEach((grp, idx) => {
    const bx = padX + idx * (badgeW + badgeGap);
    ctx.fillStyle = idx % 2 === 0 ? '#E53935' : '#1E293B';
    ctx.beginPath();
    ctx.roundRect(bx, badgeY, badgeW, badgeH, Math.round(12 * scale));
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(25 * scale)}px "JetBrains Mono", monospace`;
    const tw = ctx.measureText(grp).width;
    ctx.fillText(
      grp,
      bx + (badgeW - tw) / 2,
      badgeY + Math.round(35 * scale)
    );
  });

  // 7. Bottom Footer Bar
  const footerH = Math.round(88 * scale);
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, height - footerH, width, footerH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 ${Math.round(23 * scale)}px "Hind Siliguri", "Inter", sans-serif`;
  ctx.fillText(
    lang === 'bn'
      ? 'আয়োজনে: রক্তবন্ধন (RoktoBondhon) · বরগুনা জেলা নেটওয়ার্ক (সদর · আমতলী · বেতাগী · বামনা · পাথরঘাটা · তালতলী)'
      : 'Organized by: RoktoBondhon · Barguna District Network (Sadar · Amtali · Betagi · Bamna · Patharghata · Taltali)',
    padX,
    height - Math.round(34 * scale)
  );

  return canvas.toDataURL('image/png');
}
