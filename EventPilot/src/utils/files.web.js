export async function saveTextFile(name, text, type = 'text/plain') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function readTextFile() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.oncancel = () => reject(new Error('No file selected.'));
        input.onchange = async () => {
            try {
                const file = input.files?.[0];
                if (!file || file.size > 10 * 1024 * 1024)
                    throw new Error('Select a JSON backup smaller than 10 MB.');
                resolve(await file.text());
            }
            catch (error) {
                reject(error);
            }
        };
        input.click();
    });
}
export async function readReceipt() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,application/pdf';
        input.oncancel = () => reject(new Error('No receipt selected.'));
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file || file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'application/pdf'].includes(file.type)) {
                reject(new Error('Choose a PNG, JPEG or PDF receipt smaller than 2 MB.'));
                return;
            }
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Unable to read receipt.'));
            reader.onload = () => resolve({ name: file.name, mime_type: file.type, data_url: String(reader.result) });
            reader.readAsDataURL(file);
        };
        input.click();
    });
}
export async function downloadReceipt(name, data) {
    if (!/^data:(image\/(png|jpeg)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(data))
        throw new Error('Invalid receipt data.');
    const link = document.createElement('a');
    link.href = data;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
}
