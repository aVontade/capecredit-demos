// QR Code Generator for CapeCredit WEF Presentation
document.addEventListener('DOMContentLoaded', function() {
    // Using QRious library for QR code generation
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
    document.head.appendChild(script);
    
    script.onload = function() {
        // Generate Investor QR Code
        new QRious({
            element: document.getElementById('investor-qr'),
            value: 'https://capecredit.com/investor',
            size: 150,
            backgroundAlpha: 0,
            foreground: '#0d6efd',
            level: 'H'
        });
        
        // Generate SME QR Code
        new QRious({
            element: document.getElementById('sme-qr'),
            value: 'https://capecredit.com/download',
            size: 150,
            backgroundAlpha: 0,
            foreground: '#0d6efd',
            level: 'H'
        });
    };
});
