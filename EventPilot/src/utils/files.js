import { Share } from 'react-native';
export async function saveTextFile(name, text, _type = 'text/plain') {
    await Share.share({ title: name, message: text });
}
export async function readTextFile() { throw new Error('Paste the backup JSON below to restore on this device.'); }
export async function readReceipt() { throw new Error('Receipt uploads are currently available in the web app.'); }
export async function downloadReceipt(_name, _data) { throw new Error('Download receipts using the web app.'); }
