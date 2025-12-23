import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': url // Some sites check this
      }
    });

    if (!response.ok) {
      console.error(`Proxy fetch failed: ${response.status} ${response.statusText} for URL: ${url}`);
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || 'application/octet-stream';
    const contentLength = response.headers.get("content-length");
    console.log(`[Proxy] Fetched ${url}. Status: ${response.status}. Type: ${contentType}. Length: ${contentLength}`);

    // Less strict check, just warn
    if (!contentType.startsWith("image/") && !contentType.startsWith("application/octet-stream")) {
       console.warn(`[Proxy] Suspicious content type: ${contentType} for URL: ${url}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    // Detailed error logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Proxy internal error:", errorMessage, "URL:", url);
    return NextResponse.json(
      { error: `Failed to fetch image: ${errorMessage}` },
      { status: 500 }
    );
  }
}
