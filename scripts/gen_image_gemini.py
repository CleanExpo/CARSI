"""
One-shot Gemini image generation script.
Usage: python gen_image_gemini.py "<prompt>" --output <path> --api-key <key>
"""

import argparse
import base64
import os
import sys
from pathlib import Path


def generate_image(prompt: str, output_path: str, api_key: str, model: str = "gemini-2.5-flash-preview-05-20") -> bool:
    try:
        import google.genai as genai
        from google.genai import types
    except ImportError:
        print("ERROR: google-genai package not installed. Installing...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "google-genai", "-q"])
        import google.genai as genai
        from google.genai import types

    client = genai.Client(api_key=api_key)

    print(f"Generating image with model: {model}")
    print(f"Prompt: {prompt[:100]}...")

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    # Extract image data from response
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            image_data = part.inline_data.data
            mime_type = part.inline_data.mime_type

            # Ensure output directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)

            # Decode and save
            if isinstance(image_data, str):
                image_bytes = base64.b64decode(image_data)
            else:
                image_bytes = image_data

            # If output is webp, convert if needed
            output_ext = Path(output_path).suffix.lower()
            if output_ext == ".webp" and not mime_type.endswith("webp"):
                try:
                    from PIL import Image
                    import io
                    img = Image.open(io.BytesIO(image_bytes))
                    img.save(output_path, "WEBP", quality=92)
                    print(f"Converted to WebP and saved: {output_path}")
                except ImportError:
                    # Save as-is with webp extension
                    with open(output_path, "wb") as f:
                        f.write(image_bytes)
                    print(f"Saved (no PIL conversion): {output_path}")
            else:
                with open(output_path, "wb") as f:
                    f.write(image_bytes)
                print(f"Saved: {output_path}")

            return True

    print("ERROR: No image data found in response")
    if response.candidates:
        for part in response.candidates[0].content.parts:
            if part.text:
                print(f"Text response: {part.text}")
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("prompt")
    parser.add_argument("--output", required=True)
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--model", default="gemini-2.5-flash-preview-05-20")
    args = parser.parse_args()

    success = generate_image(args.prompt, args.output, args.api_key, args.model)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
