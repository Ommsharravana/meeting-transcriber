const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// App theme colors
const PRIMARY_COLOR = '#6366f1'; // Indigo
const BG_COLOR = '#0a0a0f'; // Dark background

// Create a microphone icon as SVG
const createMicrophoneSVG = (size) => {
  const scale = size / 512;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <rect width="512" height="512" rx="102" fill="${BG_COLOR}"/>

  <!-- Outer glow ring -->
  <circle cx="256" cy="230" r="140" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="3" opacity="0.3"/>

  <!-- Microphone body -->
  <rect x="196" y="100" width="120" height="200" rx="60" fill="${PRIMARY_COLOR}"/>

  <!-- Microphone grille lines -->
  <line x1="220" y1="140" x2="292" y2="140" stroke="${BG_COLOR}" stroke-width="6" stroke-linecap="round" opacity="0.4"/>
  <line x1="220" y1="170" x2="292" y2="170" stroke="${BG_COLOR}" stroke-width="6" stroke-linecap="round" opacity="0.4"/>
  <line x1="220" y1="200" x2="292" y2="200" stroke="${BG_COLOR}" stroke-width="6" stroke-linecap="round" opacity="0.4"/>
  <line x1="220" y1="230" x2="292" y2="230" stroke="${BG_COLOR}" stroke-width="6" stroke-linecap="round" opacity="0.4"/>

  <!-- Microphone stand arc -->
  <path d="M160 260 C160 340 200 380 256 380 C312 380 352 340 352 260"
        fill="none" stroke="${PRIMARY_COLOR}" stroke-width="20" stroke-linecap="round"/>

  <!-- Stand pole -->
  <line x1="256" y1="380" x2="256" y2="440" stroke="${PRIMARY_COLOR}" stroke-width="20" stroke-linecap="round"/>

  <!-- Stand base -->
  <line x1="196" y1="440" x2="316" y2="440" stroke="${PRIMARY_COLOR}" stroke-width="20" stroke-linecap="round"/>

  <!-- Audio wave indicators (subtle) -->
  <path d="M100 200 Q90 230 100 260" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="8" stroke-linecap="round" opacity="0.5"/>
  <path d="M70 180 Q55 230 70 280" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="6" stroke-linecap="round" opacity="0.3"/>

  <path d="M412 200 Q422 230 412 260" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="8" stroke-linecap="round" opacity="0.5"/>
  <path d="M442 180 Q457 230 442 280" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="6" stroke-linecap="round" opacity="0.3"/>
</svg>`;
};

async function generateIcons() {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');

  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { name, size } of sizes) {
    const svg = createMicrophoneSVG(512); // Generate at 512 and resize
    const outputPath = path.join(iconsDir, name);

    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: ${name} (${size}x${size})`);
  }

  // Also save the SVG for reference
  fs.writeFileSync(
    path.join(iconsDir, 'icon.svg'),
    createMicrophoneSVG(512)
  );
  console.log('Generated: icon.svg');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
