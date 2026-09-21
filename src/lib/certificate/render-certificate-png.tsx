import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';

import {
  CERT_ART_HEIGHT,
  CERT_ART_WIDTH,
  CertificateArt,
  type CertificateArtInput,
} from '@/lib/certificate/CertificateArt';

async function loadLogoDataUri(): Promise<string> {
  const bytes = await readFile(path.join(process.cwd(), 'public', 'logo', 'logo1.png'));
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

export async function renderCertificatePng(input: CertificateArtInput): Promise<Uint8Array> {
  const logoSrc = await loadLogoDataUri();
  const image = new ImageResponse(<CertificateArt {...input} logoSrc={logoSrc} />, {
    width: CERT_ART_WIDTH,
    height: CERT_ART_HEIGHT,
  });
  return new Uint8Array(await image.arrayBuffer());
}
