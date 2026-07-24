import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('============= EXTENSION DEBUG LOG =============');
    console.log(JSON.stringify(data, null, 2));
    console.log('===============================================');
    
    // Write to a local file for diagnostic review
    try {
      const logFilePath = path.join(process.cwd(), 'debug_extension.log');
      const logLine = `[${new Date().toISOString()}] ${JSON.stringify(data, null, 2)}\n\n`;
      fs.appendFileSync(logFilePath, logLine);
    } catch (fsErr) {
      console.error('Error writing to debug_extension.log:', fsErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
