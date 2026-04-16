import { NextRequest, NextResponse } from 'next/server';
import { generateImage, generateIcon } from '@/lib/image-generation/gemini-client';
import { registerImageAsset, registerIconAsset } from '@/lib/image-generation/asset-manager';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import type {
  ImageGenerationConfig,
  IconGenerationConfig,
  ImageGenerationResponse,
  IconGenerationResponse,
} from '@/lib/image-generation/types';

/* ----------------------------------------
   Authentication helper
   ---------------------------------------- */
async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const cookieToken = request.cookies.get('auth_token')?.value;
  const token = bearer || cookieToken;
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const claims = await verifySessionToken(token);
  if (!claims) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired session' },
      { status: 401 }
    );
  }
  return null; // authenticated
}

/* ----------------------------------------
   Rate Limiting (simple in-memory)
   NOTE: This resets on serverless cold starts. For production, replace with
   a persistent store such as Upstash Redis (@upstash/ratelimit). Limit is
   intentionally low (3/min) to reduce blast radius until a durable limiter
   is in place.
   ---------------------------------------- */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 3; // requests per window (kept low — in-memory resets on cold start)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

/* ----------------------------------------
   GET - Health check only (no config details leaked)
   ---------------------------------------- */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true });
}

/* ----------------------------------------
   POST - Generate Image or Icon
   ---------------------------------------- */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication — must have a valid session
    const authError = await requireAuth(request);
    if (authError) return authError;

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    // Check API key is configured
    if (!process.env.GEMINI_API_KEY?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Image generation is not configured' },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { type, config, options } = body as {
      type: 'image' | 'icon';
      config: ImageGenerationConfig | IconGenerationConfig;
      options?: {
        save?: boolean;
        filename?: string;
        subdirectory?: string;
      };
    };

    // Validate request
    if (!type || !config) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type and config' },
        { status: 400 }
      );
    }

    // Generate based on type
    if (type === 'image') {
      const imageConfig = config as ImageGenerationConfig;

      // Validate image config
      if (!imageConfig.prompt || !imageConfig.context) {
        return NextResponse.json(
          { success: false, error: 'Image config requires prompt and context' },
          { status: 400 }
        );
      }

      const image = await generateImage(imageConfig);

      // Optionally save and register asset
      if (options?.save) {
        const asset = await registerImageAsset(image, {
          filename: options.filename,
          subdirectory: options.subdirectory,
        });
        image.filePath = asset.path;
      }

      const response: ImageGenerationResponse = {
        success: true,
        image,
      };

      return NextResponse.json(response);
    }

    if (type === 'icon') {
      const iconConfig = config as IconGenerationConfig;

      // Validate icon config
      if (!iconConfig.description) {
        return NextResponse.json(
          { success: false, error: 'Icon config requires description' },
          { status: 400 }
        );
      }

      const icon = await generateIcon(iconConfig);

      // Optionally save and register asset
      if (options?.save) {
        const asset = await registerIconAsset(icon, {
          filename: options.filename,
          subdirectory: options.subdirectory,
        });
        icon.filePath = asset.path;
      }

      const response: IconGenerationResponse = {
        success: true,
        icon,
      };

      return NextResponse.json(response);
    }

    return NextResponse.json(
      { success: false, error: "Invalid type. Must be 'image' or 'icon'" },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Image generation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
