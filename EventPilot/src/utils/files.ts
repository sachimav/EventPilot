import { Share } from 'react-native';
export async function saveTextFile(name: string, text: string, _type = 'text/plain'): Promise<void> {
  await Share.share({ title: name, message: text });
}
export async function readTextFile(): Promise<string> { throw new Error('Paste the backup JSON below to restore on this device.'); }
export async function readReceipt(): Promise<{ name: string; mime_type: string; data_url: string }> { throw new Error('Receipt uploads are currently available in the web app.'); }
export async function downloadReceipt(_name: string, _data: string): Promise<void> { throw new Error('Download receipts using the web app.'); }
