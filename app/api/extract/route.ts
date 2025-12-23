
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  // Basic validation to prevent arbitrary command execution if argument wasn't sanitized (though we use array args)
  if (!url.includes('zillow.com')) {
      return NextResponse.json({ error: 'Only Zillow URLs are supported by this extractor.' }, { status: 400 });
  }

  const scriptPath = path.join(process.cwd(), 'html', 'zillow.py');

  try {
    const pythonProcess = spawn('python3', [scriptPath, url]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    return new Promise<NextResponse>((resolve) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}: ${errorString}`);
          resolve(NextResponse.json(
            { error: 'Failed to extract data', details: errorString },
            { status: 500 }
          ));
          return;
        }

        try {
          // Parse the JSON output from the script
          const jsonData = JSON.parse(dataString);
          
          if (jsonData.error) {
               resolve(NextResponse.json({ error: jsonData.error, details: jsonData.details }, { status: 400 }));
          } else {
               resolve(NextResponse.json({ images: jsonData }, { status: 200 }));
          }
        } catch (e) {
          console.error('Failed to parse Python output:', dataString);
          resolve(NextResponse.json(
            { error: 'Invalid response from extractor', details: dataString },
            { status: 500 }
          ));
        }
      });
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
